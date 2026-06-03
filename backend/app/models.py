"""
Database Models for IntelliLaw
Core user and system models — SQLite optimised
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class User(Base):
    """System users — attorneys, paralegals, admins, billing staff"""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(50),  unique=True, index=True, nullable=False)
    email         = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name     = Column(String(100))
    initials      = Column(String(10))          # e.g. "TM" for T. Moyo
    title         = Column(String(50))          # Advocate, Attorney, Paralegal
    phone         = Column(String(30))
    signature_text = Column(Text)               # letterhead signature block

    # Roles & status
    is_active     = Column(Boolean, default=True)
    is_admin      = Column(Boolean, default=False)
    user_role     = Column(String(30), default="attorney")
    # roles: admin | attorney | paralegal | billing | receptionist | readonly

    # Metadata
    created_at    = Column(DateTime, default=datetime.utcnow)
    last_login    = Column(DateTime)
    last_activity = Column(DateTime, default=datetime.utcnow)

    # Relationships
    ai_sessions   = relationship("AISession",  back_populates="user", cascade="all, delete-orphan")
    activities    = relationship("Activity",   back_populates="user", cascade="all, delete-orphan")
    time_entries  = relationship("TimeEntry",  back_populates="attorney")
    matters       = relationship("Matter",     back_populates="responsible_attorney",
                                 foreign_keys="Matter.responsible_attorney_id")


class AISession(Base):
    """AI generation and chat sessions"""
    __tablename__ = "ai_sessions"

    id              = Column(Integer, primary_key=True, index=True)
    session_type    = Column(String(50), nullable=False)
    # types: summarize | draft_contract | draft_letter | draft_affidavit |
    #        legal_opinion | case_analysis | research | qa | timeline

    input_prompt    = Column(Text)
    output_content  = Column(Text)
    document_ids    = Column(String(500))   # comma-separated
    matter_id       = Column(Integer, ForeignKey("matters.id"), nullable=True)
    parameters      = Column(Text)          # JSON

    model_used      = Column(String(100))
    tokens_used     = Column(Integer)
    generation_time = Column(Float)

    user_rating     = Column(Integer)       # 1-5
    user_feedback   = Column(Text)

    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at      = Column(DateTime, default=datetime.utcnow, index=True)

    user    = relationship("User",   back_populates="ai_sessions")
    matter  = relationship("Matter", back_populates="ai_sessions", foreign_keys=[matter_id])

    __table_args__ = (
        Index("ix_ai_sessions_user_created", "user_id", "created_at"),
        Index("ix_ai_sessions_type",         "session_type"),
    )


class Activity(Base):
    """Audit log — every significant action"""
    __tablename__ = "activities"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action        = Column(String(80),  nullable=False, index=True)
    description   = Column(String(500))
    resource_type = Column(String(50))
    resource_id   = Column(Integer)
    ip_address    = Column(String(45))
    timestamp     = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="activities")

    __table_args__ = (
        Index("ix_activities_user_ts", "user_id", "timestamp"),
    )


class SystemSettings(Base):
    """Firm-wide settings"""
    __tablename__ = "system_settings"

    id              = Column(Integer, primary_key=True, index=True)
    firm_name       = Column(String(200))
    firm_address    = Column(Text)
    firm_phone      = Column(String(50))
    firm_email      = Column(String(100))
    firm_website    = Column(String(200))
    vat_number      = Column(String(50))
    law_society_no  = Column(String(50))

    # Financial
    default_currency     = Column(String(10), default="USD")
    default_hourly_rate  = Column(Float, default=200.0)
    vat_rate             = Column(Float, default=0.15)
    invoice_prefix       = Column(String(20), default="INV")
    trust_bank_name      = Column(String(100))
    trust_account_number = Column(String(50))
    operating_bank_name  = Column(String(100))
    operating_account_number = Column(String(50))

    # AI
    ai_model_name   = Column(String(100))
    ai_model_path   = Column(String(500))
    demo_mode       = Column(Boolean, default=False)

    # Letterhead
    letterhead_template = Column(Text)

    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
