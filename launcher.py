"""
IntelliLaw Desktop App Launcher
Offline AI-Native Legal Operating System for Africa
"""

import sys
import io
import os

os.environ['PYTHONIOENCODING'] = 'utf-8'
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'buffer'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import webview
import uvicorn
import threading
import time
import socket
import logging
from pathlib import Path

if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()

APP_DIR = Path(sys._MEIPASS) if getattr(sys, 'frozen', False) else Path(__file__).parent
IS_FROZEN = getattr(sys, 'frozen', False)
sys.path.insert(0, str(APP_DIR))

# Logging
LOG_DIR = Path.home() / "IntelliLaw" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "launcher.log"

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger("IntelliLaw.Launcher")

def log(msg):
    logger.info(msg)

log("=" * 60)
log("  IntelliLaw v1.0.0")
log("  Offline AI Legal Operating System")
log("=" * 60)

# Load .env
try:
    from dotenv import load_dotenv
    env_path = APP_DIR / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        log(f"Environment loaded from: {env_path}")
    else:
        log("No .env found — using defaults")
except Exception as e:
    log(f"Env load warning: {e}")

# Database init
try:
    log("Initialising database…")
    from app.database import init_db, get_data_directory
    init_db()
    log(f"Database ready")
except Exception as e:
    log(f"FATAL: Database init failed: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

# Default admin
try:
    from app.database import get_session_local
    from app.models import User
    from app.auth import get_password_hash
    SessionLocal = get_session_local()
    db = SessionLocal()
    if db.query(User).count() == 0:
        admin = User(
            username=os.getenv("DEFAULT_ADMIN_USERNAME", "admin"),
            email=os.getenv("DEFAULT_ADMIN_EMAIL", "admin@intellilaw.local"),
            hashed_password=get_password_hash(os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin123!")),
            full_name="System Administrator",
            title="Administrator",
            initials="SA",
            is_admin=True, is_active=True, user_role="admin",
        )
        db.add(admin)
        db.commit()
        log("Default admin created — username: admin / password: Admin123!")
    db.close()
except Exception as e:
    log(f"Admin creation warning: {e}")

# AI model (non-blocking)
try:
    from app.local_llm_service import load_model
    threading.Thread(target=load_model, daemon=True).start()
    log("AI model loading in background…")
except Exception as e:
    log(f"AI init warning: {e}")

# FastAPI
try:
    from app.main import app as fastapi_app, setup_frontend_serving
    log("FastAPI app loaded")
except Exception as e:
    log(f"FATAL: FastAPI import failed: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)


def find_free_port(start=8000, end=8100):
    for port in range(start, end):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    raise RuntimeError("No free ports available")


def wait_for_backend(url, timeout=30):
    import requests
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if requests.get(f"{url}/api/health", timeout=2).status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def run_server_only():
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    log(f"SERVER-ONLY mode: {host}:{port}")
    setup_frontend_serving()
    uvicorn.Config(fastapi_app, host=host, port=port, log_level="info")
    uvicorn.Server(uvicorn.Config(fastapi_app, host=host, port=port, log_level="info")).run()


class IntelliLawApp:
    def __init__(self):
        self.server = None
        self.window = None
        self.port = None
        self.backend_ready = False

    def start_backend(self):
        self.port = find_free_port()
        log(f"Port: {self.port}")
        setup_frontend_serving()
        config = uvicorn.Config(fastapi_app, host="0.0.0.0", port=self.port,
                                log_level="info", access_log=False)
        self.server = uvicorn.Server(config)
        threading.Thread(target=self.server.run, daemon=True).start()
        url = f"http://127.0.0.1:{self.port}"
        if wait_for_backend(url, timeout=40):
            self.backend_ready = True
            log(f"Backend ready at {url}")
        else:
            raise Exception("Backend failed to start within 40s")

    def create_window(self):
        url = f"http://127.0.0.1:{self.port}"
        self.window = webview.create_window(
            title="IntelliLaw — Legal Operating System",
            url=url,
            width=1440, height=900,
            resizable=True, min_size=(1100, 700),
            background_color='#0a0e1a',
        )
        log("Window created")

    def run(self):
        log("Starting IntelliLaw Desktop…")
        self.start_backend()
        self.create_window()
        webview.start(debug=False)
        log("Application closed")


if __name__ == "__main__":
    try:
        if os.getenv("INTELLILAW_SERVER_ONLY") == "1":
            run_server_only()
        else:
            IntelliLawApp().run()
    except KeyboardInterrupt:
        log("Interrupted by user")
        sys.exit(0)
    except Exception as e:
        log(f"FATAL: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
