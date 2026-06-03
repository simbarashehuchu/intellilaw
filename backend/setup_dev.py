"""
IntelliLaw — Dev Setup Script
Run once to check database and create admin user.
Usage: python setup_dev.py
"""
import os
import sys

# Make sure we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app.database import init_db, get_session_local
from app.models import User
from app.auth import get_password_hash

print("=" * 50)
print("  IntelliLaw Dev Setup")
print("=" * 50)

# Init database
print("\n[1] Initialising database...")
init_db()
print("    Database ready")

# Check users
print("\n[2] Checking users...")
db = get_session_local()()
user_count = db.query(User).count()
print(f"    Users found: {user_count}")

if user_count > 0:
    users = db.query(User).all()
    for u in users:
        print(f"    - {u.username} | role={u.user_role} | admin={u.is_admin} | active={u.is_active}")
    print("\n    Admin already exists. Try logging in with your credentials.")
else:
    print("\n[3] Creating default admin...")
    admin = User(
        username="admin",
        email="admin@intellilaw.local",
        hashed_password=get_password_hash("Admin123!"),
        full_name="System Administrator",
        title="Administrator",
        initials="SA",
        is_admin=True,
        is_active=True,
        user_role="admin",
    )
    db.add(admin)
    db.commit()
    print("    Admin created successfully!")
    print("\n    Login credentials:")
    print("    Username : admin")
    print("    Password : Admin123!")

db.close()

print("\n" + "=" * 50)
print("  Setup complete. Start the server:")
print("  uvicorn app.main:app --reload --port 8100")
print("=" * 50)
