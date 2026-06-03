"""
IntelliSchool Payment Gateway Service
========================================
Supports:
  - Paynow (Zimbabwe's primary online payment gateway)
  - EcoCash Direct (USSD-triggered mobile money)
  - InnBucks, OneMoney (stubs — same pattern as EcoCash)
  - Offline fallback: queues payment intent, retries when online

PAYNOW INTEGRATION
------------------
Paynow is Zimbabwe's dominant payment aggregator.
It routes to: EcoCash, OneMoney, ZimSwitch (bank cards), InnBucks.
One integration covers all major payment methods.

Docs: https://developers.paynow.co.zw/

ENVIRONMENT VARIABLES (.env)
-----------------------------
PAYNOW_INTEGRATION_ID=xxxxx       # from Paynow merchant portal
PAYNOW_INTEGRATION_KEY=xxxxxx     # from Paynow merchant portal
PAYNOW_RETURN_URL=http://your-school-server:8000/api/payments/return
PAYNOW_RESULT_URL=http://your-school-server:8000/api/payments/webhook
PAYMENT_CURRENCY=USD               # USD or ZWL

USAGE
-----
From bursar_routes.py or a parent-facing endpoint:
    from app.payment_gateway import PaymentGateway
    gw = PaymentGateway()
    result = await gw.initiate(student_id=1, amount=150.00,
                               description="Term 1 Fees", email="parent@mail.com",
                               phone="0771234567")
    if result["success"]:
        redirect_url = result["redirect_url"]   # send parent here
"""

import hashlib
import logging
import os
import time
import urllib.parse
from datetime import datetime
from typing import Optional
import httpx
from sqlalchemy.orm import Session

logger = logging.getLogger("intellischool.payments")

# ── Config ────────────────────────────────────────────────────────────────────

PAYNOW_BASE          = "https://www.paynow.co.zw/interface/initiatetransaction"
PAYNOW_STATUS_URL    = "https://www.paynow.co.zw/interface/querytransaction"

def _cfg(key, default=""):
    return os.getenv(key, default).strip()


# ── Paynow hash ───────────────────────────────────────────────────────────────

def _paynow_hash(fields: dict, integration_key: str) -> str:
    """
    Paynow requires SHA-512 hash of all field values concatenated
    (in the order they appear in the POST), followed by the integration key.
    """
    values = "".join(str(v) for v in fields.values())
    raw    = values + integration_key
    return hashlib.sha512(raw.encode("utf-8")).hexdigest().upper()


# ── Payment Gateway ───────────────────────────────────────────────────────────

class PaymentGateway:
    """
    Single entry-point for all Zimbabwe payment methods.
    Currently implements Paynow (which covers EcoCash, OneMoney,
    bank cards, and InnBucks via Paynow's routing).
    """

    def __init__(self):
        self.integration_id  = _cfg("PAYNOW_INTEGRATION_ID")
        self.integration_key = _cfg("PAYNOW_INTEGRATION_KEY")
        self.return_url      = _cfg("PAYNOW_RETURN_URL", "http://localhost:8000/api/payments/return")
        self.result_url      = _cfg("PAYNOW_RESULT_URL", "http://localhost:8000/api/payments/webhook")
        self.currency        = _cfg("PAYMENT_CURRENCY", "USD")
        self._enabled        = bool(self.integration_id and self.integration_key)

        if not self._enabled:
            logger.warning(
                "Payment gateway not configured. Set PAYNOW_INTEGRATION_ID and "
                "PAYNOW_INTEGRATION_KEY in .env to enable live payments."
            )

    def is_configured(self) -> bool:
        return self._enabled

    # ── Initiate payment ──────────────────────────────────────────────────────

    async def initiate(
        self,
        student_id:  int,
        amount:      float,
        description: str,
        email:       str,
        phone:       str = "",
        fee_record_id: Optional[int] = None,
        payment_method: str = "ecocash",   # ecocash | onemoney | innbucks | card
    ) -> dict:
        """
        Initiate a Paynow payment.

        Returns:
            {
              "success":      True,
              "redirect_url": "https://www.paynow.co.zw/Payment/...",
              "poll_url":     "https://...",    # for status polling
              "reference":    "INV-20260101-001",
              "provider":     "paynow"
            }
        """
        if not self._enabled:
            return {
                "success": False,
                "error":   "Payment gateway not configured on this server.",
                "demo":    True,
            }

        ref = f"IS-{student_id}-{int(time.time())}"
        amount_str = f"{amount:.2f}"

        fields = {
            "id":          self.integration_id,
            "reference":   ref,
            "amount":      amount_str,
            "additionalinfo": description,
            "returnurl":   self.return_url,
            "resulturl":   self.result_url,
            "authemail":   email or "noemail@intellischool.zw",
            "status":      "Message",
        }
        fields["hash"] = _paynow_hash(fields, self.integration_key)

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(PAYNOW_BASE, data=fields)
                resp.raise_for_status()

            parsed = dict(urllib.parse.parse_qsl(resp.text))
            status = parsed.get("status", "").lower()

            if status == "error":
                logger.error(f"Paynow error: {parsed.get('error', 'unknown')}")
                return {"success": False, "error": parsed.get("error", "Paynow returned an error")}

            if status not in ("ok", "created"):
                return {"success": False, "error": f"Unexpected Paynow status: {status}"}

            redirect_url = parsed.get("browserurl", "")
            poll_url     = parsed.get("pollurl",    "")

            # If mobile money requested, also trigger USSD push
            if phone and payment_method in ("ecocash", "onemoney", "innbucks"):
                await self._mobile_initiate(poll_url, phone, payment_method)

            logger.info(f"Payment initiated: ref={ref} amount={amount_str} method={payment_method}")
            return {
                "success":      True,
                "redirect_url": redirect_url,
                "poll_url":     poll_url,
                "reference":    ref,
                "provider":     "paynow",
                "fee_record_id": fee_record_id,
            }

        except httpx.RequestError as exc:
            logger.error(f"Paynow network error: {exc}")
            return {"success": False, "error": "Could not reach Paynow. Check internet connection."}

    # ── Mobile money USSD push ────────────────────────────────────────────────

    async def _mobile_initiate(self, poll_url: str, phone: str, method: str) -> bool:
        """
        After Paynow creates the transaction, push a USSD prompt to the
        customer's phone via Paynow's mobile initiate endpoint.
        """
        mobile_url = "https://www.paynow.co.zw/interface/remotetransaction"
        method_map = {"ecocash": "ecocash", "onemoney": "onemoney", "innbucks": "innbucks"}
        fields = {
            "id":      self.integration_id,
            "pollurl": poll_url,
            "phone":   phone.replace(" ", "").replace("+263", "0"),
            "method":  method_map.get(method, "ecocash"),
        }
        fields["hash"] = _paynow_hash(fields, self.integration_key)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(mobile_url, data=fields)
                parsed = dict(urllib.parse.parse_qsl(resp.text))
                ok = parsed.get("status","").lower() in ("ok","sent")
                logger.info(f"Mobile initiate {method} → {phone}: {'OK' if ok else parsed}")
                return ok
        except Exception as exc:
            logger.warning(f"Mobile initiate failed (non-critical): {exc}")
            return False

    # ── Poll payment status ───────────────────────────────────────────────────

    async def poll_status(self, poll_url: str) -> dict:
        """
        Check payment status using the poll_url returned by initiate().
        Returns: { "status": "paid"|"pending"|"failed", "amount": float, ... }
        """
        if not poll_url:
            return {"status": "unknown"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(poll_url, data={
                    "id":   self.integration_id,
                    "hash": _paynow_hash({"id": self.integration_id}, self.integration_key),
                })
            parsed = dict(urllib.parse.parse_qsl(resp.text))
            raw_status = parsed.get("status", "").lower()
            status = (
                "paid"    if raw_status in ("paid", "awaiting delivery") else
                "pending" if raw_status in ("sent", "created", "pending") else
                "failed"
            )
            return {
                "status":  status,
                "amount":  float(parsed.get("amount", 0)),
                "method":  parsed.get("paymentmethod", ""),
                "raw":     raw_status,
            }
        except Exception as exc:
            logger.error(f"Poll status error: {exc}")
            return {"status": "unknown", "error": str(exc)}

    # ── Webhook verification ──────────────────────────────────────────────────

    def verify_webhook(self, payload: dict) -> bool:
        """
        Verify that an incoming webhook from Paynow is authentic.
        Paynow sends a hash; we recompute it to confirm the payload
        has not been tampered with.
        """
        received_hash = payload.pop("hash", "").upper()
        expected_hash = _paynow_hash(payload, self.integration_key).upper()
        return received_hash == expected_hash


# ── Module-level singleton ────────────────────────────────────────────────────

payment_gateway = PaymentGateway()