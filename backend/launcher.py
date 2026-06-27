"""
IntelliLaw — Production Launcher
Starts the FastAPI/Uvicorn server when run as a PyInstaller executable.
"""
import os
import sys
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("launcher")


def _resolve_data_dir() -> Path:
    """Return the directory that holds the bundled app files."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent


def main():
    data_dir = _resolve_data_dir()

    # Add bundled app to sys.path so 'app.*' imports work
    if str(data_dir) not in sys.path:
        sys.path.insert(0, str(data_dir))

    # When launched by Electron the env-var tells us to run headless only
    server_only = os.environ.get("INTELLILAW_SERVER_ONLY", "").lower() in ("1", "true")

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))

    logger.info(f"IntelliLaw backend starting on {host}:{port}")

    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        # No reload in production
        reload=False,
    )


if __name__ == "__main__":
    main()
