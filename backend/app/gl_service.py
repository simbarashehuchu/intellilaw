"""
IntelliLaw — General Ledger Service
Double-entry bookkeeping automation for trust transactions
"""
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.legal_models import (
    JournalEntry, JournalEntryLine, ChartOfAccounts,
    TrustTransaction, TrustAccount, Client
)


def post_trust_transaction_to_gl(
    db: Session,
    trust_txn: TrustTransaction,
    posted_by_id: int,
    posted_by_name: str = "System"
) -> JournalEntry:
    """
    Create automatic 3-line journal entry for trust transaction.

    Receipt: DR Bank (1100) / CR Client Funds Control (2100)
    Disbursement: DR Client Funds Control (2100) / CR Bank (1100)

    Args:
        db: Database session
        trust_txn: TrustTransaction object (already created and flushed)
        posted_by_id: User ID posting the entry
        posted_by_name: Display name for audit trail

    Returns:
        JournalEntry object (committed)
    """
    # Get related entities
    account = db.query(TrustAccount).filter(
        TrustAccount.id == trust_txn.account_id
    ).first()
    if not account:
        raise ValueError(f"Trust account {trust_txn.account_id} not found")

    client = db.query(Client).filter(Client.id == account.client_id).first()
    client_name = client.display_name if client else f"Client {account.client_id}"

    # Generate GL reference number
    gl_ref = f"TR-{account.client_id:04d}-{trust_txn.id:06d}"

    # Create journal entry
    je = JournalEntry(
        entry_date=trust_txn.date,
        reference_number=gl_ref,
        description=f"{trust_txn.transaction_type.upper()}: {trust_txn.description} ({client_name})",
        source_type="trust_transaction",
        source_id=trust_txn.id,
        status="posted",
        posted_by_id=posted_by_id,
        posted_at=datetime.utcnow(),
    )

    # Create journal entry lines based on transaction type
    if trust_txn.transaction_type == "receipt":
        # Receipt: DR Bank (1100) / CR Client Funds Control (2100)
        je.lines.append(JournalEntryLine(
            account_code="1100",
            account_name="Trust Bank Account",
            debit=trust_txn.amount,
            credit=0.0,
            description=f"Receipt: {trust_txn.description}",
        ))
        je.lines.append(JournalEntryLine(
            account_code="2100",
            account_name="Client Funds Held - Control Account",
            debit=0.0,
            credit=trust_txn.amount,
            description=f"Receipt for {client_name}",
        ))
        # Sub-ledger line for audit detail (per client)
        je.lines.append(JournalEntryLine(
            account_code=f"2100-{account.client_id}",
            account_name=f"Client Funds Sub - {client_name}",
            debit=0.0,
            credit=trust_txn.amount,
            client_id=account.client_id,
            description=f"Receipt for {client_name}",
        ))

    elif trust_txn.transaction_type == "disbursement":
        # Disbursement: DR Client Funds Control (2100) / CR Bank (1100)
        je.lines.append(JournalEntryLine(
            account_code="2100",
            account_name="Client Funds Held - Control Account",
            debit=trust_txn.amount,
            credit=0.0,
            description=f"Disbursement: {trust_txn.description}",
        ))
        # Sub-ledger line for audit detail (per client)
        je.lines.append(JournalEntryLine(
            account_code=f"2100-{account.client_id}",
            account_name=f"Client Funds Sub - {client_name}",
            debit=trust_txn.amount,
            credit=0.0,
            client_id=account.client_id,
            description=f"Disbursement for {client_name}",
        ))
        je.lines.append(JournalEntryLine(
            account_code="1100",
            account_name="Trust Bank Account",
            debit=0.0,
            credit=trust_txn.amount,
            description=f"Disbursement: {trust_txn.description}",
        ))

    # Persist journal entry
    db.add(je)
    db.flush()  # Get the JE ID

    # Link transaction to journal entry
    trust_txn.journal_entry_id = je.id
    db.commit()

    return je


def get_gl_account_balance(db: Session, account_code: str) -> float:
    """
    Calculate GL account balance from all journal entry lines.

    Balance = Sum(debit) - Sum(credit)
    """
    result = db.query(
        (JournalEntryLine.debit - JournalEntryLine.credit).label("balance")
    ).filter(
        JournalEntryLine.account_code == account_code
    ).all()

    return sum(r[0] for r in result) if result else 0.0


def calculate_trust_account_total(db: Session, client_id: int = None) -> float:
    """
    Calculate total trust balance (all or per-client).

    If client_id is None, returns sum of all TrustAccount balances.
    Otherwise returns balance for specific client.
    """
    if client_id:
        account = db.query(TrustAccount).filter(
            TrustAccount.client_id == client_id
        ).first()
        return account.balance if account else 0.0
    else:
        result = db.query(func.sum(TrustAccount.balance)).scalar()
        return result if result else 0.0


def get_reconciliation_variance(db: Session) -> dict:
    """
    Calculate GL reconciliation variance for Law Society compliance.

    Returns:
        {
            "gl_control_balance": float,      # GL 2100 balance
            "calculated_balance": float,      # Sum of all TrustAccount.balance
            "variance": float,                 # Difference
            "reconciled": bool,               # True if variance < 0.01
        }
    """
    # GL Control Account (2100) balance
    gl_balance = get_gl_account_balance(db, "2100")

    # Sum of all trust accounts
    calculated_balance = db.query(func.sum(TrustAccount.balance)).scalar() or 0.0

    variance = abs(gl_balance - calculated_balance)
    reconciled = variance < 0.01

    return {
        "gl_control_balance": round(gl_balance, 2),
        "calculated_balance": round(calculated_balance, 2),
        "variance": round(variance, 2),
        "reconciled": reconciled,
    }
