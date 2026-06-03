"""
IntelliLaw — Legal Domain Models
Clients, Matters, Documents, Billing, Research
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, Float, Date, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.models import Base
import enum


# ══════════════════════════════════════════════════════
# ENUMS (stored as strings)
# ══════════════════════════════════════════════════════

class ClientType(str, enum.Enum):
    INDIVIDUAL  = "individual"
    CORPORATE   = "corporate"
    GOVERNMENT  = "government"
    NGO         = "ngo"

class MatterStatus(str, enum.Enum):
    ACTIVE      = "active"
    PENDING     = "pending"
    CLOSED      = "closed"
    SUSPENDED   = "suspended"
    ARCHIVED    = "archived"

class MatterType(str, enum.Enum):
    LITIGATION          = "litigation"
    CONVEYANCING        = "conveyancing"
    CORPORATE           = "corporate"
    EMPLOYMENT          = "employment"
    FAMILY              = "family"
    CRIMINAL            = "criminal"
    CONSTITUTIONAL      = "constitutional"
    COMMERCIAL          = "commercial"
    INTELLECTUAL_PROP   = "intellectual_property"
    TAX                 = "tax"
    MINING              = "mining"
    IMMIGRATION         = "immigration"
    OTHER               = "other"

class HearingType(str, enum.Enum):
    HEARING         = "hearing"
    TRIAL           = "trial"
    MENTION         = "mention"
    JUDGMENT        = "judgment"
    FILING_DEADLINE = "filing_deadline"
    MEETING         = "meeting"
    ARBITRATION     = "arbitration"
    MEDIATION       = "mediation"
    OTHER           = "other"

class InvoiceStatus(str, enum.Enum):
    DRAFT       = "draft"
    SENT        = "sent"
    PARTIAL     = "partial"
    PAID        = "paid"
    OVERDUE     = "overdue"
    CANCELLED   = "cancelled"

class TrustTransactionType(str, enum.Enum):
    RECEIPT     = "receipt"
    DISBURSEMENT = "disbursement"
    TRANSFER    = "transfer"
    REFUND      = "refund"

class ConflictStatus(str, enum.Enum):
    RAISED       = "raised"
    UNDER_REVIEW = "under_review"
    CLEARED      = "cleared"
    DECLINED     = "declined"

class ConflictRiskLevel(str, enum.Enum):
    LOW          = "low"
    MEDIUM       = "medium"
    HIGH         = "high"
    CLEAR        = "clear"

class AccountType(str, enum.Enum):
    ASSET        = "asset"
    LIABILITY    = "liability"
    EQUITY       = "equity"
    REVENUE      = "revenue"
    EXPENSE      = "expense"

class JournalEntryStatus(str, enum.Enum):
    DRAFT        = "draft"
    POSTED       = "posted"
    REVERSED     = "reversed"


# ══════════════════════════════════════════════════════
# CLIENTS
# ══════════════════════════════════════════════════════

class Client(Base):
    __tablename__ = "clients"

    id              = Column(Integer, primary_key=True, index=True)
    client_number   = Column(String(30), unique=True, index=True)  # e.g. CLT-0001
    client_type     = Column(String(20), default="individual")

    # Individual fields
    first_name      = Column(String(100))
    last_name       = Column(String(100))
    id_number       = Column(String(50))        # National ID / Passport
    date_of_birth   = Column(Date, nullable=True)

    # Corporate fields
    company_name    = Column(String(200))
    registration_no = Column(String(50))
    vat_number      = Column(String(50))
    contact_person  = Column(String(150))

    # Contact
    email           = Column(String(100), index=True)
    phone           = Column(String(30))
    phone_alt       = Column(String(30))
    address_line1   = Column(String(200))
    address_line2   = Column(String(200))
    city            = Column(String(100))
    country         = Column(String(100), default="Zimbabwe")

    # Status
    is_active       = Column(Boolean, default=True)
    risk_rating     = Column(String(20), default="standard")  # low | standard | high
    notes           = Column(Text)
    tags            = Column(String(500))       # comma-separated

    # KYC / compliance
    kyc_verified    = Column(Boolean, default=False)
    kyc_date        = Column(Date, nullable=True)
    kyc_documents   = Column(Text)              # JSON list of doc paths

    # Metadata
    created_by      = Column(Integer, ForeignKey("users.id"))
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    matters         = relationship("Matter",   back_populates="client", cascade="all, delete-orphan")
    invoices        = relationship("Invoice",  back_populates="client")
    trust_accounts  = relationship("TrustAccount", back_populates="client")
    documents       = relationship("LegalDocument", back_populates="client")
    conflicts       = relationship("Conflict", back_populates="client", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_clients_name", "last_name", "first_name"),
    )

    @property
    def display_name(self):
        if self.client_type == "individual":
            return f"{self.first_name or ''} {self.last_name or ''}".strip()
        return self.company_name or ""


# ══════════════════════════════════════════════════════
# MATTERS
# ══════════════════════════════════════════════════════

class Matter(Base):
    __tablename__ = "matters"

    id                       = Column(Integer, primary_key=True, index=True)
    matter_number            = Column(String(30), unique=True, index=True)  # e.g. MTR-2024-001
    title                    = Column(String(300), nullable=False)
    description              = Column(Text)
    matter_type              = Column(String(50), default="litigation")
    status                   = Column(String(20), default="active")

    # Court / opposing
    court_name               = Column(String(200))
    case_number              = Column(String(100))       # Court case number
    opposing_counsel         = Column(String(200))
    opposing_party           = Column(String(200))
    judge_name               = Column(String(100))
    division                 = Column(String(100))       # High Court div, etc.

    # Relationships
    client_id                = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    responsible_attorney_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    supervising_attorney_id  = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Dates
    opened_date              = Column(Date, default=date.today)
    closed_date              = Column(Date, nullable=True)
    next_hearing_date        = Column(Date, nullable=True)

    # Billing
    billing_type             = Column(String(30), default="hourly")  # hourly | fixed | contingency
    hourly_rate              = Column(Float, nullable=True)
    fixed_fee                = Column(Float, nullable=True)
    estimated_value          = Column(Float, nullable=True)
    retainer_amount          = Column(Float, nullable=True)
    currency                 = Column(String(10), default="USD")

    # Flags
    is_urgent                = Column(Boolean, default=False)
    is_pro_bono              = Column(Boolean, default=False)
    tags                     = Column(String(500))
    internal_notes           = Column(Text)

    created_by               = Column(Integer, ForeignKey("users.id"))
    created_at               = Column(DateTime, default=datetime.utcnow)
    updated_at               = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client                   = relationship("Client",   back_populates="matters", foreign_keys=[client_id])
    responsible_attorney     = relationship("User",     back_populates="matters",
                                            foreign_keys=[responsible_attorney_id])
    documents                = relationship("LegalDocument", back_populates="matter", cascade="all, delete-orphan")
    notes                    = relationship("MatterNote",    back_populates="matter", cascade="all, delete-orphan")
    hearings                 = relationship("Hearing",       back_populates="matter", cascade="all, delete-orphan")
    tasks                    = relationship("Task",          back_populates="matter", cascade="all, delete-orphan")
    time_entries             = relationship("TimeEntry",     back_populates="matter", cascade="all, delete-orphan")
    invoices                 = relationship("Invoice",       back_populates="matter")
    ai_sessions              = relationship("AISession",     back_populates="matter", foreign_keys="AISession.matter_id")
    access_grants            = relationship("MatterAccess",  back_populates="matter", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_matters_client_status", "client_id", "status"),
    )


class MatterAccess(Base):
    """Matter-level access control — explicit grants for users beyond responsible attorney"""
    __tablename__ = "matter_access"

    id              = Column(Integer, primary_key=True, index=True)
    matter_id       = Column(Integer, ForeignKey("matters.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    access_level    = Column(String(20), nullable=False, index=True)
    # Levels: "view" (read-only), "edit" (read+write), "admin" (full control)

    granted_by      = Column(Integer, ForeignKey("users.id"), nullable=False)
    granted_at      = Column(DateTime, default=datetime.utcnow)
    notes           = Column(Text)
    expires_at      = Column(DateTime, nullable=True)  # Time-limited access

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    matter          = relationship("Matter", foreign_keys=[matter_id])
    user            = relationship("User", foreign_keys=[user_id])
    grantor         = relationship("User", foreign_keys=[granted_by])

    __table_args__ = (
        UniqueConstraint("matter_id", "user_id", name="uq_matter_user_access"),
        Index("ix_matter_access_user", "user_id"),
        Index("ix_matter_access_expires", "expires_at"),
    )


class MatterNote(Base):
    __tablename__ = "matter_notes"

    id          = Column(Integer, primary_key=True, index=True)
    matter_id   = Column(Integer, ForeignKey("matters.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    content     = Column(Text, nullable=False)
    note_type   = Column(String(30), default="general")  # general | advice | instruction | attendance
    is_privileged = Column(Boolean, default=True)        # attorney-client privilege flag
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    matter = relationship("Matter", back_populates="notes")
    author = relationship("User", foreign_keys=[author_id])


# ══════════════════════════════════════════════════════
# HEARINGS & CALENDAR
# ══════════════════════════════════════════════════════

class Hearing(Base):
    __tablename__ = "hearings"

    id              = Column(Integer, primary_key=True, index=True)
    matter_id       = Column(Integer, ForeignKey("matters.id", ondelete="CASCADE"), nullable=False, index=True)
    hearing_type    = Column(String(40), default="hearing")
    title           = Column(String(300))
    description     = Column(Text)

    date            = Column(Date, nullable=False, index=True)
    time            = Column(String(10))            # "09:00"
    duration_minutes = Column(Integer, default=60)
    location        = Column(String(300))           # Court room / address
    court_name      = Column(String(200))
    judge_name      = Column(String(100))

    # Outcome
    outcome         = Column(Text)
    next_date       = Column(Date, nullable=True)
    is_completed    = Column(Boolean, default=False)

    # Reminders
    reminder_sent   = Column(Boolean, default=False)
    reminder_days   = Column(Integer, default=3)     # days before

    assigned_to     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by      = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    matter          = relationship("Matter", back_populates="hearings")
    assignee        = relationship("User", foreign_keys=[assigned_to])


# ══════════════════════════════════════════════════════
# TASKS
# ══════════════════════════════════════════════════════

class Task(Base):
    __tablename__ = "tasks"

    id              = Column(Integer, primary_key=True, index=True)
    matter_id       = Column(Integer, ForeignKey("matters.id", ondelete="CASCADE"), nullable=True, index=True)
    title           = Column(String(300), nullable=False)
    description     = Column(Text)
    priority        = Column(String(20), default="medium")  # low | medium | high | urgent
    status          = Column(String(20), default="pending")  # pending | in_progress | completed | cancelled
    due_date        = Column(Date, nullable=True, index=True)
    completed_date  = Column(Date, nullable=True)

    assigned_to     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by      = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    matter          = relationship("Matter", back_populates="tasks")
    assignee        = relationship("User", foreign_keys=[assigned_to])


# ══════════════════════════════════════════════════════
# DOCUMENTS
# ══════════════════════════════════════════════════════

class LegalDocument(Base):
    __tablename__ = "legal_documents"

    id                  = Column(Integer, primary_key=True, index=True)
    matter_id           = Column(Integer, ForeignKey("matters.id"), nullable=True, index=True)
    client_id           = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)

    # File info
    filename            = Column(String(255), nullable=False)
    original_filename   = Column(String(255), nullable=False)
    file_path           = Column(String(500), nullable=False)
    file_type           = Column(String(20))    # pdf | docx | txt | jpg | ...
    file_size           = Column(Integer)

    # Content extraction
    extracted_text      = Column(Text)
    extracted_text_path = Column(String(500))
    ocr_processed       = Column(Boolean, default=False)

    # Metadata
    doc_category        = Column(String(80), default="general")
    # categories: pleading | affidavit | contract | correspondence | court_order |
    #             title_deed | invoice | evidence | research | general

    doc_type            = Column(String(80))    # more specific sub-type
    description         = Column(Text)
    tags                = Column(String(500))
    version             = Column(Integer, default=1)
    parent_doc_id       = Column(Integer, ForeignKey("legal_documents.id"), nullable=True)

    # Privilege
    is_privileged       = Column(Boolean, default=False)
    is_confidential     = Column(Boolean, default=True)

    # Usage
    usage_count         = Column(Integer, default=0)
    last_used           = Column(DateTime)

    uploaded_by         = Column(Integer, ForeignKey("users.id"), nullable=True)
    upload_date         = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    matter              = relationship("Matter", back_populates="documents")
    client              = relationship("Client", back_populates="documents")
    uploader            = relationship("User",   foreign_keys=[uploaded_by])
    versions            = relationship("LegalDocument", foreign_keys=[parent_doc_id])

    __table_args__ = (
        Index("ix_docs_matter_cat", "matter_id", "doc_category"),
    )


# ══════════════════════════════════════════════════════
# BILLING — TIME ENTRIES
# ══════════════════════════════════════════════════════

class TimeEntry(Base):
    __tablename__ = "time_entries"

    id              = Column(Integer, primary_key=True, index=True)
    matter_id       = Column(Integer, ForeignKey("matters.id"), nullable=False, index=True)
    attorney_id     = Column(Integer, ForeignKey("users.id"),   nullable=False, index=True)

    date            = Column(Date, nullable=False, default=date.today)
    hours           = Column(Float, nullable=False)
    rate            = Column(Float, nullable=False)
    amount          = Column(Float, nullable=False)     # hours * rate

    description     = Column(Text, nullable=False)
    activity_code   = Column(String(30))                # UTBMS / custom code
    is_billable     = Column(Boolean, default=True)
    is_billed       = Column(Boolean, default=False)    # included in invoice
    invoice_id      = Column(Integer, ForeignKey("invoices.id"), nullable=True)

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    matter          = relationship("Matter", back_populates="time_entries")
    attorney        = relationship("User",   back_populates="time_entries")
    invoice         = relationship("Invoice", back_populates="time_entries", foreign_keys=[invoice_id])


# ══════════════════════════════════════════════════════
# BILLING — INVOICES
# ══════════════════════════════════════════════════════

class Invoice(Base):
    __tablename__ = "invoices"

    id              = Column(Integer, primary_key=True, index=True)
    invoice_number  = Column(String(50), unique=True, index=True)
    matter_id       = Column(Integer, ForeignKey("matters.id"), nullable=True)
    client_id       = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    status          = Column(String(20), default="draft")
    issue_date      = Column(Date, default=date.today)
    due_date        = Column(Date, nullable=True)
    currency        = Column(String(10), default="USD")

    # Amounts
    subtotal        = Column(Float, default=0.0)
    vat_rate        = Column(Float, default=0.15)
    vat_amount      = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total           = Column(Float, default=0.0)
    amount_paid     = Column(Float, default=0.0)
    balance_due     = Column(Float, default=0.0)

    notes           = Column(Text)
    payment_terms   = Column(String(200))

    created_by      = Column(Integer, ForeignKey("users.id"))
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    matter          = relationship("Matter",  back_populates="invoices")
    client          = relationship("Client",  back_populates="invoices")
    line_items      = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    payments        = relationship("Payment", back_populates="invoice")
    time_entries    = relationship("TimeEntry", back_populates="invoice", foreign_keys="TimeEntry.invoice_id")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id          = Column(Integer, primary_key=True, index=True)
    invoice_id  = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=False)
    quantity    = Column(Float, default=1.0)
    unit_price  = Column(Float, nullable=False)
    amount      = Column(Float, nullable=False)
    item_type   = Column(String(30), default="fee")  # fee | disbursement | vat

    invoice = relationship("Invoice", back_populates="line_items")


class Payment(Base):
    __tablename__ = "payments"

    id              = Column(Integer, primary_key=True, index=True)
    invoice_id      = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    client_id       = Column(Integer, ForeignKey("clients.id"), nullable=False)
    amount          = Column(Float, nullable=False)
    payment_date    = Column(Date,  nullable=False, default=date.today)
    payment_method  = Column(String(50))    # cash | transfer | cheque | mobile_money | card
    reference       = Column(String(100))   # bank ref / cheque number
    notes           = Column(Text)
    created_by      = Column(Integer, ForeignKey("users.id"))
    created_at      = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="payments")


# ══════════════════════════════════════════════════════
# TRUST ACCOUNTING
# ══════════════════════════════════════════════════════

class TrustAccount(Base):
    """Per-client trust account ledger"""
    __tablename__ = "trust_accounts"

    id              = Column(Integer, primary_key=True, index=True)
    client_id       = Column(Integer, ForeignKey("clients.id"), nullable=False, unique=True)
    matter_id       = Column(Integer, ForeignKey("matters.id"), nullable=True)
    balance         = Column(Float, default=0.0)
    currency        = Column(String(10), default="USD")
    opened_date     = Column(Date, default=date.today)
    notes           = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client          = relationship("Client", back_populates="trust_accounts")
    transactions    = relationship("TrustTransaction", back_populates="account", cascade="all, delete-orphan")


class TrustTransaction(Base):
    __tablename__ = "trust_transactions"

    id              = Column(Integer, primary_key=True, index=True)
    account_id      = Column(Integer, ForeignKey("trust_accounts.id", ondelete="CASCADE"), nullable=False)
    transaction_type = Column(String(20), nullable=False)   # receipt | disbursement | transfer | refund
    amount          = Column(Float, nullable=False)
    running_balance = Column(Float, nullable=False)
    date            = Column(Date, nullable=False, default=date.today)
    description     = Column(Text, nullable=False)
    reference       = Column(String(100))
    payment_method  = Column(String(50))
    approved_by     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by      = Column(Integer, ForeignKey("users.id"))
    created_at      = Column(DateTime, default=datetime.utcnow)

    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)

    account = relationship("TrustAccount", back_populates="transactions")
    journal_entry = relationship("JournalEntry", foreign_keys=[journal_entry_id])


# ══════════════════════════════════════════════════════
# GENERAL LEDGER — DOUBLE-ENTRY BOOKKEEPING
# ══════════════════════════════════════════════════════

class ChartOfAccounts(Base):
    """Chart of Accounts — pre-seeded GL account master"""
    __tablename__ = "chart_of_accounts"

    id              = Column(Integer, primary_key=True, index=True)
    account_code    = Column(String(20), unique=True, index=True, nullable=False)  # e.g. "1000", "2100"
    account_name    = Column(String(100), nullable=False)
    account_type    = Column(String(20), nullable=False)  # asset | liability | equity | revenue | expense

    # Trust accounting flags
    is_trust_account = Column(Boolean, default=False)
    is_client_funds = Column(Boolean, default=False)     # Master GL for all client funds

    description     = Column(Text)
    active          = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_chart_code", "account_code"),
    )


class JournalEntry(Base):
    """Journal Entry — automatic GL posting from trust transactions"""
    __tablename__ = "journal_entries"

    id              = Column(Integer, primary_key=True, index=True)
    entry_date      = Column(Date, nullable=False, index=True)
    reference_number = Column(String(100), index=True, nullable=False)  # e.g. "TR-2024-00123"
    description     = Column(Text)

    # Source document
    source_type     = Column(String(50))     # "trust_transaction"
    source_id       = Column(Integer)        # ID of TrustTransaction

    status          = Column(String(20), default="posted")  # draft | posted | reversed

    posted_by_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    posted_at       = Column(DateTime, default=datetime.utcnow)

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, onupdate=datetime.utcnow)

    posted_by       = relationship("User", foreign_keys=[posted_by_id])
    lines           = relationship("JournalEntryLine", cascade="all, delete-orphan", back_populates="entry")

    __table_args__ = (
        Index("ix_journal_date", "entry_date"),
        Index("ix_journal_ref", "reference_number"),
    )


class JournalEntryLine(Base):
    """Journal Entry Line — individual GL line item"""
    __tablename__ = "journal_entry_lines"

    id              = Column(Integer, primary_key=True, index=True)
    entry_id        = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False)

    account_code    = Column(String(20), nullable=False)  # e.g. "1100", "2100"
    account_name    = Column(String(100))                 # Denormalized for reporting

    debit           = Column(Float, default=0.0)
    credit          = Column(Float, default=0.0)

    client_id       = Column(Integer, ForeignKey("clients.id"), nullable=True)

    description     = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)

    entry           = relationship("JournalEntry", back_populates="lines")
    client          = relationship("Client", foreign_keys=[client_id])


# ══════════════════════════════════════════════════════
# CONFLICT CHECKING
# ══════════════════════════════════════════════════════

class Conflict(Base):
    """Conflict of interest tracking and clearance workflow"""
    __tablename__ = "conflicts"

    id                       = Column(Integer, primary_key=True, index=True)
    status                   = Column(String(20), default="raised")  # raised | under_review | cleared | declined

    # Parties
    client_id                = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    opposing_name            = Column(String(300), nullable=False)
    opposing_counsel_name    = Column(String(200), nullable=True)

    # Linkage
    matter_id                = Column(Integer, ForeignKey("matters.id"), nullable=True, index=True)

    # Assessment
    risk_level               = Column(String(20), default="medium")  # low | medium | high | clear
    reason                   = Column(Text, nullable=False)

    # Workflow tracking
    raised_by_id             = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    raised_at                = Column(DateTime, default=datetime.utcnow)

    reviewed_by_id           = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at              = Column(DateTime, nullable=True)
    notes                    = Column(Text)  # Attorney's clearance/decline notes

    created_at               = Column(DateTime, default=datetime.utcnow)
    updated_at               = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client                   = relationship("Client", foreign_keys=[client_id])
    matter                   = relationship("Matter", foreign_keys=[matter_id])
    raised_by                = relationship("User", foreign_keys=[raised_by_id])
    reviewed_by              = relationship("User", foreign_keys=[reviewed_by_id])

    __table_args__ = (
        Index("ix_conflicts_client_status", "client_id", "status"),
        Index("ix_conflicts_raised_at", "raised_at"),
    )


# ══════════════════════════════════════════════════════
# DISBURSEMENTS / EXPENSES
# ══════════════════════════════════════════════════════

class Disbursement(Base):
    """Recoverable expenses charged to a matter"""
    __tablename__ = "disbursements"

    id              = Column(Integer, primary_key=True, index=True)
    matter_id       = Column(Integer, ForeignKey("matters.id"), nullable=False, index=True)
    date            = Column(Date, default=date.today)
    description     = Column(String(300), nullable=False)
    amount          = Column(Float, nullable=False)
    disbursement_type = Column(String(60))   # court_fees | sheriff | search_fees | copies | travel | other
    receipt_ref     = Column(String(100))
    is_billable     = Column(Boolean, default=True)
    is_billed       = Column(Boolean, default=False)
    invoice_id      = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    created_by      = Column(Integer, ForeignKey("users.id"))
    created_at      = Column(DateTime, default=datetime.utcnow)


# ══════════════════════════════════════════════════════
# LEGAL RESEARCH
# ══════════════════════════════════════════════════════

class ResearchSession(Base):
    __tablename__ = "research_sessions"

    id              = Column(Integer, primary_key=True, index=True)
    matter_id       = Column(Integer, ForeignKey("matters.id"), nullable=True)
    title           = Column(String(300))
    query           = Column(Text, nullable=False)
    results         = Column(Text)              # JSON array of results
    ai_summary      = Column(Text)
    research_type   = Column(String(50), default="general")
    # types: statute | case_law | constitutional | regulatory | general
    jurisdiction    = Column(String(100), default="Zimbabwe")
    tags            = Column(String(500))
    is_saved        = Column(Boolean, default=False)
    created_by      = Column(Integer, ForeignKey("users.id"))
    created_at      = Column(DateTime, default=datetime.utcnow)

    matter = relationship("Matter", foreign_keys=[matter_id])


class LegalPrecedent(Base):
    """Indexed case law and statutes for local search"""
    __tablename__ = "legal_precedents"

    id              = Column(Integer, primary_key=True, index=True)
    title           = Column(String(400), nullable=False)
    citation        = Column(String(200), unique=True)
    court           = Column(String(200))
    date            = Column(Date, nullable=True)
    jurisdiction    = Column(String(100), default="Zimbabwe")
    category        = Column(String(80))    # contract | delict | criminal | constitutional | etc.
    source_type     = Column(String(30), default="case")  # case | statute | regulation | commentary
    full_text       = Column(Text)
    summary         = Column(Text)
    headnotes       = Column(Text)
    keywords        = Column(Text)          # comma-separated
    is_active       = Column(Boolean, default=True)
    added_by        = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
