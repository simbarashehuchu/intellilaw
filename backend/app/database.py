"""
Database Configuration — IntelliLaw
Tenant-aware, offline-first, SQLite with encryption (SQLCipher)
"""
import os
import logging
import secrets
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
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


def get_database_path() -> Path:
    """Returns absolute path to database file."""
    data_dir = get_data_directory()
    return (data_dir / "intellilaw.db").resolve()


def get_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    db_path = get_database_path()
    return f"sqlite:///{str(db_path).replace(chr(92), '/')}"


def get_encryption_key() -> str:
    """
    Get or generate the database encryption key.

    - Reads from .env DB_ENCRYPTION_KEY
    - If missing, generates new 256-bit key (64 hex chars)
    - Auto-appends to .env for persistence

    Returns: 64-character hex string (256-bit key for AES-256)
    """
    env_file = Path(__file__).parent.parent / ".env"

    # Reload .env to get latest values
    load_dotenv(env_file, override=True)
    key = os.getenv("DB_ENCRYPTION_KEY", "").strip()

    if key and len(key) == 64:
        return key

    logger.info("Generating new database encryption key...")
    new_key = secrets.token_hex(32)

    # Append to .env file if it exists
    if env_file.exists():
        with open(env_file, "a") as f:
            f.write(f"\nDB_ENCRYPTION_KEY={new_key}\n")
        # Reload .env after appending
        load_dotenv(env_file, override=True)
        logger.info(f"Encryption key saved to {env_file}")
    else:
        logger.warning(f".env file not found at {env_file}; using generated key only (not persisted)")

    return new_key


def _is_plaintext_database(db_path: Path) -> bool:
    """
    Detect if database is plaintext SQLite (not encrypted with SQLCipher).

    Attempts to read the first byte of the database file.
    - Plaintext SQLite starts with 'SQLite format 3'
    - Encrypted SQLCipher is binary and cannot be read as plaintext

    Returns: True if plaintext, False if encrypted or doesn't exist
    """
    if not db_path.exists():
        return False

    try:
        with open(db_path, "rb") as f:
            header = f.read(16)
            return header.startswith(b"SQLite format 3")
    except Exception as e:
        logger.warning(f"Could not detect DB encryption status: {e}")
        return False


def _migrate_plaintext_to_encrypted(db_path: Path, encryption_key: str) -> bool:
    """
    Auto-migrate plaintext SQLite database to encrypted SQLCipher.

    Steps:
    1. Check if DB is plaintext
    2. If yes: create backup with .backup extension
    3. Dump all data from plaintext DB
    4. Create new encrypted DB with encryption key
    5. Restore data to encrypted DB
    6. Verify row counts match
    7. Securely delete plaintext backup

    Returns: True if migration successful, False if no migration needed
    """
    if not _is_plaintext_database(db_path):
        return False

    logger.info(f"Plaintext database detected. Starting migration to encrypted DB...")

    try:
        import sqlite3
        import sqlcipher3

        backup_path = db_path.with_suffix(".db.plaintext.backup")

        # Step 1: Backup plaintext DB
        logger.info(f"Creating backup: {backup_path}")
        backup_path.write_bytes(db_path.read_bytes())

        # Step 2: Open plaintext DB and dump SQL
        logger.info("Dumping plaintext database...")
        plaintext_conn = sqlite3.connect(str(db_path))
        plaintext_cursor = plaintext_conn.cursor()
        plaintext_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = plaintext_cursor.fetchall()
        plaintext_row_count = sum(
            plaintext_cursor.execute(f"SELECT COUNT(*) FROM {t[0]}").fetchone()[0]
            for t in tables
        )

        # Get all SQL to recreate schema and data
        plaintext_cursor.execute("SELECT sql FROM sqlite_master WHERE sql NOT NULL")
        schema_sql = [row[0] for row in plaintext_cursor.fetchall()]

        # Extract all data
        data_sql = []
        for table_name, in tables:
            plaintext_cursor.execute(f"SELECT * FROM {table_name}")
            rows = plaintext_cursor.fetchall()
            for row in rows:
                cols = [col[0] for col in plaintext_cursor.description]
                data_sql.append((table_name, cols, row))

        plaintext_conn.close()

        # Step 3: Remove plaintext DB and create encrypted one
        logger.info("Creating encrypted database...")
        db_path.unlink()

        # Step 4: Create new encrypted DB and restore data
        encrypted_conn = sqlcipher3.connect(str(db_path))
        encrypted_conn.execute(f"PRAGMA key = 'x\"{encryption_key}\"'")
        encrypted_conn.execute("PRAGMA journal_mode = WAL")
        encrypted_cursor = encrypted_conn.cursor()

        # Restore schema
        for sql in schema_sql:
            if sql:
                encrypted_cursor.execute(sql)

        # Restore data
        for table_name, cols, row in data_sql:
            placeholders = ", ".join(["?"] * len(cols))
            insert_sql = f"INSERT INTO {table_name} ({', '.join(cols)}) VALUES ({placeholders})"
            encrypted_cursor.execute(insert_sql, row)

        encrypted_conn.commit()

        # Step 5: Verify row counts match
        encrypted_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        enc_tables = encrypted_cursor.fetchall()
        encrypted_row_count = sum(
            encrypted_cursor.execute(f"SELECT COUNT(*) FROM {t[0]}").fetchone()[0]
            for t in enc_tables
        )

        encrypted_conn.close()

        if encrypted_row_count != plaintext_row_count:
            raise Exception(
                f"Row count mismatch after migration: "
                f"plaintext={plaintext_row_count}, encrypted={encrypted_row_count}"
            )

        logger.info(f"Migration successful. Rows migrated: {encrypted_row_count}")

        # Step 6: Securely delete plaintext backup
        logger.info(f"Securely deleting plaintext backup: {backup_path}")
        try:
            from secure_delete import secure_delete as shred
            shred(str(backup_path))
        except Exception as e:
            logger.warning(f"Could not securely delete backup (falling back to standard delete): {e}")
            try:
                backup_path.unlink()
            except Exception as e2:
                logger.warning(f"Could not delete backup file: {e2}")

        return True

    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        # Restore from backup if it exists
        if backup_path.exists():
            logger.info(f"Restoring from backup: {backup_path}")
            db_path.write_bytes(backup_path.read_bytes())
        raise


class EncryptedSQLiteConnection:
    """
    Custom SQLAlchemy connection wrapper for SQLCipher encrypted databases.

    Provides transparent encryption via sqlcipher3 bindings.
    Handles PRAGMA key setup and WAL mode optimization.
    """

    def __init__(self, db_path: Path, encryption_key: str):
        self.db_path = db_path
        self.encryption_key = encryption_key

    def __call__(self):
        """Return encrypted sqlcipher3 connection with key and optimizations."""
        try:
            import sqlcipher3
            conn = sqlcipher3.connect(str(self.db_path), check_same_thread=False)
            conn.execute(f"PRAGMA key = 'x\"{self.encryption_key}\"'")
        except ModuleNotFoundError:
            import sqlite3
            logger.warning("sqlcipher3 not available — falling back to unencrypted sqlite3 (dev only)")
            conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA foreign_keys = ON")
        return conn


_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        db_path = get_database_path()
        encryption_key = get_encryption_key()

        # Migrate plaintext DB to encrypted BEFORE creating engine
        try:
            import sqlcipher3 as _sc  # noqa: F401
            _sqlcipher_available = True
        except ModuleNotFoundError:
            _sqlcipher_available = False

        if _sqlcipher_available:
            try:
                if _is_plaintext_database(db_path):
                    logger.info("Plaintext database detected, migrating to encrypted...")
                    _migrate_plaintext_to_encrypted(db_path, encryption_key)
            except Exception as e:
                logger.error(f"Failed to migrate database: {e}")
                raise
        else:
            logger.warning("sqlcipher3 unavailable — skipping encryption migration (dev mode)")

        # Create engine with encrypted connection
        # NullPool: creates a new connection per request (required for sqlcipher3
        # which cannot share connections across threads like StaticPool does)
        _engine = create_engine(
            "sqlite:///ignored",  # URL ignored, using creator function
            creator=EncryptedSQLiteConnection(db_path, encryption_key),
            poolclass=NullPool,
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

    # Register all legal models FIRST before creating any tables
    try:
        import app.legal_models as _lm
    except Exception as e:
        logger.warning(f"Could not import legal models: {e}")

    engine = get_engine()
    Base.metadata.create_all(bind=engine)

    # Create legal model tables
    try:
        import app.legal_models as _lm
        _lm.Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Could not create legal model tables: {e}")

    # Apply runtime migrations
    try:
        _apply_migrations(engine)
    except Exception as e:
        logger.warning(f"Could not apply migrations: {e}")

    # Seed Chart of Accounts
    try:
        _seed_chart_of_accounts(engine)
    except Exception as e:
        logger.warning(f"Could not seed Chart of Accounts: {e}")

    logger.info("Database ready.")


def _apply_migrations(engine):
    """Apply runtime schema migrations to existing databases."""
    with engine.connect() as conn:
        # Migration: Add journal_entry_id to trust_transactions if missing
        try:
            from sqlalchemy import inspect
            inspector = inspect(engine)
            columns = {col['name'] for col in inspector.get_columns('trust_transactions')}

            if 'journal_entry_id' not in columns:
                logger.info("Migrating trust_transactions: adding journal_entry_id column...")
                conn.execute(text("""
                    ALTER TABLE trust_transactions
                    ADD COLUMN journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL
                """))
                conn.commit()
                logger.info("Migration applied: journal_entry_id added to trust_transactions")
        except Exception as e:
            logger.warning(f"Migration skipped (column may already exist): {e}")

        # Migration: Add billing_units to time_entries if missing
        try:
            inspector = inspect(engine)
            columns = {col['name'] for col in inspector.get_columns('time_entries')}
            if 'billing_units' not in columns:
                logger.info("Migrating time_entries: adding billing_units column...")
                conn.execute(text("""
                    ALTER TABLE time_entries
                    ADD COLUMN billing_units INTEGER
                """))
                # Backfill existing rows: billing_units = ceil(hours * 10)
                conn.execute(text("""
                    UPDATE time_entries
                    SET billing_units = CAST(CEIL(hours * 10) AS INTEGER)
                    WHERE billing_units IS NULL
                """))
                conn.commit()
                logger.info("Migration applied: billing_units added to time_entries")
        except Exception as e:
            logger.warning(f"billing_units migration skipped: {e}")

        # Migration: Create matter_access table if missing (for access control)
        try:
            from sqlalchemy import inspect
            inspector = inspect(engine)

            if 'matter_access' not in inspector.get_table_names():
                logger.info("Creating matter_access table...")
                conn.execute(text("""
                    CREATE TABLE matter_access (
                        id INTEGER PRIMARY KEY,
                        matter_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        access_level TEXT NOT NULL,
                        granted_by INTEGER NOT NULL,
                        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        notes TEXT,
                        expires_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (granted_by) REFERENCES users(id),
                        UNIQUE (matter_id, user_id)
                    )
                """))
                conn.execute(text("""CREATE INDEX ix_matter_access_user ON matter_access(user_id)"""))
                conn.execute(text("""CREATE INDEX ix_matter_access_expires ON matter_access(expires_at)"""))
                conn.commit()
                logger.info("MatterAccess table created")

                # Populate existing responsible attorneys as "edit" access grants
                logger.info("Granting existing responsible attorneys access...")
                admin_id = 1  # Default admin from init_db
                try:
                    conn.execute(text("""
                        INSERT OR IGNORE INTO matter_access
                        (matter_id, user_id, access_level, granted_by, granted_at, notes)
                        SELECT DISTINCT m.id, m.responsible_attorney_id, 'edit', :admin_id, CURRENT_TIMESTAMP,
                               'Implicit access as responsible attorney'
                        FROM matters m
                        WHERE m.responsible_attorney_id IS NOT NULL
                    """), {"admin_id": admin_id})
                    conn.commit()
                    logger.info("Responsible attorney access grants created")
                except Exception as inner_e:
                    logger.warning(f"Could not auto-grant responsible attorney access: {inner_e}")
        except Exception as e:
            logger.warning(f"MatterAccess migration skipped: {e}")

        # Migration: Add KYC onboarding columns to clients if missing
        try:
            inspector = inspect(engine)
            columns = {col['name'] for col in inspector.get_columns('clients')}
            kyc_migrations = [
                ("kyc_status",            "ALTER TABLE clients ADD COLUMN kyc_status TEXT DEFAULT 'pending'"),
                ("kyc_verified_at",       "ALTER TABLE clients ADD COLUMN kyc_verified_at TIMESTAMP"),
                ("kyc_verified_by",       "ALTER TABLE clients ADD COLUMN kyc_verified_by INTEGER REFERENCES users(id)"),
                ("onboarding_checklist",  "ALTER TABLE clients ADD COLUMN onboarding_checklist TEXT"),
                ("engagement_letter_sent","ALTER TABLE clients ADD COLUMN engagement_letter_sent INTEGER DEFAULT 0"),
                ("source_of_funds",       "ALTER TABLE clients ADD COLUMN source_of_funds TEXT"),
                ("beneficial_owner",      "ALTER TABLE clients ADD COLUMN beneficial_owner TEXT"),
            ]
            for col_name, sql in kyc_migrations:
                if col_name not in columns:
                    logger.info(f"Migrating clients: adding {col_name}...")
                    conn.execute(text(sql))
            conn.commit()
            logger.info("KYC onboarding columns migration complete")
        except Exception as e:
            logger.warning(f"KYC columns migration skipped: {e}")


def _seed_chart_of_accounts(engine):
    """Seed pre-defined GL accounts for Law Society compliance."""
    from sqlalchemy.orm import Session
    from app.legal_models import ChartOfAccounts

    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Check if accounts already exist
        existing_count = db.query(ChartOfAccounts).count()
        if existing_count > 0:
            logger.info(f"Chart of Accounts already seeded ({existing_count} accounts). Skipping.")
            return

        # Standard GL account chart
        accounts = [
            ChartOfAccounts(
                account_code="1000",
                account_name="Bank/Operating Cash",
                account_type="asset",
                is_trust_account=False,
                description="Operating cash account"
            ),
            ChartOfAccounts(
                account_code="1100",
                account_name="Trust Bank Account",
                account_type="asset",
                is_trust_account=True,
                description="Client trust funds held in bank"
            ),
            ChartOfAccounts(
                account_code="2100",
                account_name="Client Funds Held - Control Account",
                account_type="liability",
                is_trust_account=True,
                is_client_funds=True,
                description="Master GL account for all client trust funds (Law Society compliance)"
            ),
            ChartOfAccounts(
                account_code="2100-SUB",
                account_name="Client Funds Sub-Ledger",
                account_type="liability",
                is_trust_account=True,
                description="Per-client sub-ledger detail accounts (2100-{client_id})"
            ),
            ChartOfAccounts(
                account_code="3000",
                account_name="Retained Earnings",
                account_type="equity",
                description="Firm retained earnings"
            ),
            ChartOfAccounts(
                account_code="4000",
                account_name="Legal Fees",
                account_type="revenue",
                description="Professional fees revenue"
            ),
        ]

        db.add_all(accounts)
        db.commit()
        logger.info(f"Seeded {len(accounts)} Chart of Accounts entries")

    except Exception as e:
        logger.error(f"Error seeding Chart of Accounts: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def get_db():
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_database_info():
    db_path = get_database_path()
    return {
        "path": str(db_path),
        "exists": db_path.exists(),
        "size_kb": round(db_path.stat().st_size / 1024, 1) if db_path.exists() else 0,
        "encrypted": not _is_plaintext_database(db_path),
    }

