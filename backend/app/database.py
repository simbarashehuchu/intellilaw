"""
Database Configuration — IntelliLaw
Tenant-aware, offline-first, SQLite
"""
import os
import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.models import Base

logger = logging.getLogger(__name__)


def get_data_directory() -> Path:
    school_id = os.getenv("FIRM_ID", "default")
    base = Path.home() / "IntelliLaw" / "firms" / school_id / "data"
    try:
        base.mkdir(parents=True, exist_ok=True)
        test = base / ".write_test"
        test.write_text("ok")
        test.unlink()
    except Exception:
        base = Path.home() / ".intellilaw" / "data"
        base.mkdir(parents=True, exist_ok=True)
    return base


def get_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    data_dir = get_data_directory()
    db_path = (data_dir / "intellilaw.db").resolve()
    return f"sqlite:///{str(db_path).replace(chr(92), '/')}"


_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(
            get_database_url(),
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False,
        )
    return _engine


def get_session_local():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal


def init_db():
    """Create all tables and apply any runtime column migrations."""
    logger.info("Initialising IntelliLaw database...")
    engine = get_engine()
    Base.metadata.create_all(bind=engine)

    # Register all legal models
    try:
        import app.legal_models as _lm
        _lm.Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Could not create legal model tables: {e}")

    logger.info("Database ready.")


def get_db():
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_database_info():
    data_dir = get_data_directory()
    db_path = data_dir / "intellilaw.db"
    return {
        "path": str(db_path),
        "exists": db_path.exists(),
        "size_kb": round(db_path.stat().st_size / 1024, 1) if db_path.exists() else 0,
    }
