"""
IntelliSchool Payment Routes
==============================
FastAPI router for all payment endpoints.

Add to main.py:
    from app.payment_routes import router as payment_router
    app.include_router(payment_router)
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth            import get_current_active_user
from app.database        import get_db
from app.models          import User
from app.payment_gateway import payment_gateway
from app.sms_models      import FeeRecord, Transaction, TransactionType

logger = logging.getLogger("intellischool.payment_routes")

router = APIRouter(prefix="/api/payments", tags=["Payments"])


# ── Request/Response models ───────────────────────────────────────────────────

class PaymentInitiateRequest(BaseModel):
    fee_record_id:  Optional[int]  = None
    student_id:     int
    amount:         float
    description:    str            = "School Fee Payment"
    email:          str            = ""
    phone:          str            = ""
    payment_method: str            = "ecocash"   # ecocash|onemoney|innbucks|card


class ManualPaymentRequest(BaseModel):
    fee_record_id:  int
    amount_paid:    float
    payment_method: str  = "cash"
    currency:       str  = "USD"
    receipt_number: Optional[str] = None
    notes:          Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/gateway-status")
async def gateway_status(current_user: User = Depends(get_current_active_user)):
    """Check whether the payment gateway is configured."""
    return {
        "configured": payment_gateway.is_configured(),
        "provider":   "paynow",
        "currency":   payment_gateway.currency,
        "methods":    ["ecocash", "onemoney", "innbucks", "card", "cash"],
        "message": (
            "Payment gateway is active."
            if payment_gateway.is_configured()
            else "Payment gateway not configured. Set PAYNOW_INTEGRATION_ID and "
                 "PAYNOW_INTEGRATION_KEY in .env to enable online payments."
        ),
    }


@router.post("/initiate")
async def initiate_payment(
    payload: PaymentInitiateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Initiate an online payment via Paynow.
    Returns a redirect_url that the frontend opens in a browser / WebView.
    """
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    # Validate fee record if provided
    if payload.fee_record_id:
        fee = db.query(FeeRecord).filter(FeeRecord.id == payload.fee_record_id).first()
        if not fee:
            raise HTTPException(status_code=404, detail="Fee record not found")
        if fee.balance <= 0:
            raise HTTPException(status_code=400, detail="This fee has already been fully paid")

    result = await payment_gateway.initiate(
        student_id      = payload.student_id,
        amount          = payload.amount,
        description     = payload.description,
        email           = payload.email,
        phone           = payload.phone,
        fee_record_id   = payload.fee_record_id,
        payment_method  = payload.payment_method,
    )

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Payment initiation failed"))

    # Log a pending transaction
    try:
        pending_txn = Transaction(
            date             = datetime.utcnow().date(),
            transaction_type = TransactionType.FEE_PAYMENT,
            description      = f"Online payment initiated: {payload.description}",
            amount           = payload.amount,
            category         = "online_payment",
            reference_number = result.get("reference"),
            notes            = f"Paynow poll_url: {result.get('poll_url', '')}",
            created_by       = current_user.id,
            approved         = False,       # not confirmed until webhook
        )
        db.add(pending_txn)
        db.commit()
    except Exception as exc:
        logger.warning(f"Could not log pending transaction: {exc}")

    return result


@router.get("/status/{reference}")
async def payment_status(
    reference:    str,
    poll_url:     str = "",
    current_user: User = Depends(get_current_active_user),
    db: Session   = Depends(get_db),
):
    """
    Poll the current status of a payment using its poll_url.
    The poll_url is returned by /initiate and stored in the Transaction record.
    """
    # Try to find poll_url from DB if not provided
    if not poll_url:
        txn = db.query(Transaction).filter(
            Transaction.reference_number == reference
        ).first()
        if txn and txn.notes and "poll_url:" in txn.notes:
            poll_url = txn.notes.split("poll_url:")[-1].strip()

    if not poll_url:
        return {"status": "unknown", "message": "No poll URL available for this reference"}

    result = await payment_gateway.poll_status(poll_url)

    # If paid, update the fee record and confirm the transaction
    if result.get("status") == "paid":
        txn = db.query(Transaction).filter(
            Transaction.reference_number == reference
        ).first()
        if txn and not txn.approved:
            txn.approved      = True
            txn.approval_date = datetime.utcnow()
            txn.notes         = (txn.notes or "") + f" | Confirmed at {datetime.utcnow().isoformat()}"
            db.commit()
            logger.info(f"Payment confirmed: reference={reference} amount={result.get('amount')}")

    return result


@router.post("/webhook")
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Paynow result URL webhook — called by Paynow when payment completes.
    Verifies the hash signature and marks the fee record as paid.
    """
    form_data = await request.form()
    payload   = dict(form_data)

    # Verify hash
    if not payment_gateway.verify_webhook(payload):
        logger.warning(f"Invalid webhook hash — possible tampering: {payload}")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    reference  = payload.get("reference", "")
    raw_status = payload.get("status", "").lower()
    amount     = float(payload.get("amount", 0))

    logger.info(f"Webhook received: ref={reference} status={raw_status} amount={amount}")

    paid = raw_status in ("paid", "awaiting delivery")
    if not paid:
        return {"received": True, "action": "none", "status": raw_status}

    # Find and update the transaction
    txn = db.query(Transaction).filter(
        Transaction.reference_number == reference
    ).first()
    if txn:
        txn.approved      = True
        txn.approval_date = datetime.utcnow()
        txn.notes         = (txn.notes or "") + f" | Webhook confirmed {datetime.utcnow().isoformat()}"

    # Parse student_id from reference "IS-{student_id}-{timestamp}"
    try:
        parts      = reference.split("-")
        student_id = int(parts[1]) if len(parts) >= 2 else None
    except (ValueError, IndexError):
        student_id = None

    # Update matching fee records
    updated_fees = 0
    if student_id and amount > 0:
        fee_records = db.query(FeeRecord).filter(
            FeeRecord.student_id == student_id,
            FeeRecord.balance    >  0,
        ).order_by(FeeRecord.due_date).all()

        remaining = amount
        for fee in fee_records:
            if remaining <= 0:
                break
            pay = min(remaining, fee.balance)
            fee.amount_paid = (fee.amount_paid or 0) + pay
            fee.balance     = max(0, fee.balance - pay)
            fee.status      = "paid" if fee.balance <= 0 else "partial"
            fee.updated_at  = datetime.utcnow()
            remaining      -= pay
            updated_fees   += 1

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(f"Webhook DB commit failed: {exc}")
        raise HTTPException(status_code=500, detail="Database update failed")

    logger.info(f"Webhook processed: ref={reference} fees_updated={updated_fees}")
    return {"received": True, "action": "payment_recorded", "fees_updated": updated_fees}


@router.get("/return")
async def payment_return(
    reference: str = "",
    status:    str = "",
):
    """
    Paynow returnUrl — user is redirected here after completing payment in browser.
    Returns a simple HTML page (Electron/WebView loads this).
    """
    if status.lower() in ("paid", "ok"):
        html = f"""
        <html><head><title>Payment Complete</title>
        <meta http-equiv="refresh" content="3;url=http://localhost:5173/fees">
        </head><body style="font-family:Arial;text-align:center;padding:60px;background:#f0fdf4">
        <h1 style="color:#059669">✅ Payment Successful</h1>
        <p>Reference: <strong>{reference}</strong></p>
        <p>Your fee record has been updated. Redirecting…</p>
        </body></html>"""
    else:
        html = f"""
        <html><head><title>Payment Status</title>
        <meta http-equiv="refresh" content="3;url=http://localhost:5173/fees">
        </head><body style="font-family:Arial;text-align:center;padding:60px;background:#fff5f5">
        <h1 style="color:#d97706">⏳ Payment Pending</h1>
        <p>Reference: <strong>{reference}</strong></p>
        <p>Your payment is being processed. Check your fee balance shortly.</p>
        </body></html>"""

    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.post("/manual")
async def record_manual_payment(
    payload:      ManualPaymentRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session   = Depends(get_db),
):
    """
    Record a cash / cheque / manual payment made in person.
    Callable by bursar role.
    """
    if current_user.user_role not in ("bursar", "admin", "principal"):
        raise HTTPException(status_code=403, detail="Bursar role required")

    fee = db.query(FeeRecord).filter(FeeRecord.id == payload.fee_record_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found")

    pay_amount = min(payload.amount_paid, fee.balance)
    if pay_amount <= 0:
        raise HTTPException(status_code=400, detail="Fee already fully paid")

    fee.amount_paid  = (fee.amount_paid or 0) + pay_amount
    fee.balance      = max(0, fee.balance - pay_amount)
    fee.status       = "paid" if fee.balance <= 0 else "partial"
    fee.updated_at   = datetime.utcnow()

    ref = payload.receipt_number or f"RCP-{int(datetime.utcnow().timestamp())}"

    txn = Transaction(
        date             = datetime.utcnow().date(),
        transaction_type = TransactionType.FEE_PAYMENT,
        description      = f"Manual payment — {payload.payment_method}",
        amount           = pay_amount,
        category         = "fee_payment",
        reference_number = ref,
        notes            = payload.notes or "",
        created_by       = current_user.id,
        approved         = True,
        approval_date    = datetime.utcnow(),
        currency         = payload.currency,
        payment_method   = payload.payment_method,
    )
    db.add(txn)

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    logger.info(
        f"Manual payment recorded: fee_id={fee.id} amount={pay_amount} "
        f"method={payload.payment_method} by={current_user.username}"
    )
    return {
        "success":        True,
        "receipt_number": ref,
        "amount_paid":    pay_amount,
        "new_balance":    fee.balance,
        "fee_status":     fee.status,
    }