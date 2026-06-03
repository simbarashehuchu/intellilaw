"""
IntelliLaw — Authentication & Authorization
JWT-based auth with role-based access control
"""
import os
import secrets
import json
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet

from app.database import get_db
from app.models import User

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production-intellilaw")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
IDLE_TIMEOUT_MINUTES = int(os.getenv("IDLE_TIMEOUT_MINUTES", "30"))

# Encryption cipher for TOTP secrets and backup codes
CIPHER_KEY = Fernet.generate_key()
cipher = Fernet(CIPHER_KEY)

pwd_context  = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a secret string."""
    return cipher.encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    """Decrypt an encrypted secret."""
    return cipher.decrypt(ciphertext.encode()).decode()


def create_temporary_mfa_token(user_id: int) -> str:
    """Create a temporary token for MFA verification (5 min expiry)."""
    data = {"sub": f"mfa_{user_id}", "type": "mfa"}
    expire = datetime.utcnow() + timedelta(minutes=5)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def decode_temporary_mfa_token(token: str) -> int:
    """Decode temporary MFA token and extract user_id."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "mfa":
            raise ValueError("Invalid token type")
        user_id = int(payload.get("sub", "").replace("mfa_", ""))
        return user_id
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid MFA token")

pwd_context  = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    user.last_login    = datetime.utcnow()
    user.last_activity = datetime.utcnow()
    db.commit()
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise creds_exc
    except JWTError:
        raise creds_exc

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise creds_exc

    # Check idle timeout
    if user.last_activity:
        time_since_activity = datetime.utcnow() - user.last_activity
        idle_seconds = time_since_activity.total_seconds()
        timeout_seconds = IDLE_TIMEOUT_MINUTES * 60

        if idle_seconds > timeout_seconds:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session idle timeout"
            )

    user.last_activity = datetime.utcnow()
    db.commit()
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    return current_user


def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


def require_billing(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.user_role not in ["billing", "admin"]:
        raise HTTPException(status_code=403, detail="Billing privileges required")
    return current_user


async def require_matter_access(
    matter_id: int,
    required_level: str = "view",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> bool:
    """
    Verify user has required access level to a matter.

    Access hierarchy:
    1. Admin users: always have full access
    2. Responsible attorney: implicit "edit" access
    3. Explicit MatterAccess grants: honor time limits
    4. No access: deny request

    Returns: True if access granted, raises HTTPException(403) if denied
    """
    from app.legal_models import Matter, MatterAccess

    # Admins always have access
    if current_user.is_admin:
        return True

    # Get matter
    matter = db.query(Matter).filter(Matter.id == matter_id).first()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")

    # Responsible attorney has implicit "edit" access
    if matter.responsible_attorney_id == current_user.id:
        if required_level in ["view", "edit"]:
            return True

    # Check explicit MatterAccess grant (honor time limits)
    access_grant = db.query(MatterAccess).filter(
        (MatterAccess.matter_id == matter_id) &
        (MatterAccess.user_id == current_user.id) &
        ((MatterAccess.expires_at.is_(None)) | (MatterAccess.expires_at > datetime.utcnow()))
    ).first()

    if access_grant:
        # Map access_level hierarchy: "admin" > "edit" > "view"
        level_hierarchy = {"view": 1, "edit": 2, "admin": 3}
        user_level = level_hierarchy.get(access_grant.access_level, 0)
        required = level_hierarchy.get(required_level, 0)

        if user_level >= required:
            return True

    # No access
    raise HTTPException(
        status_code=403,
        detail=f"Access denied: you do not have '{required_level}' access to this matter"
    )
