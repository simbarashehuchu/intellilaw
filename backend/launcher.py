"""
IntelliLaw — Production Launcher
Starts the FastAPI/Uvicorn server when run as a PyInstaller executable.
"""
import os
import sys
import shutil
import secrets
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("launcher")


def _resolve_data_dir() -> Path:
    """Return the directory that holds the bundled app files (_MEIPASS or source root)."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent


def _get_user_env_file() -> Path:
    """Return the persistent .env path in the user's IntelliLaw data directory."""
    firm_id = os.environ.get("FIRM_ID", "default")
    return Path.home() / "IntelliLaw" / "firms" / firm_id / ".env"


def _ensure_env(data_dir: Path) -> Path:
    """
    Locate or create the persistent .env for this installation.

    On first run (frozen exe) the file doesn't exist yet, so we copy the
    bundled .env.example and generate real SECRET_KEY / DB_ENCRYPTION_KEY.
    Returns the path to the .env file.
    """
    if not getattr(sys, "frozen", False):
        # Dev mode — use the .env next to this file
        return data_dir / ".env"

    env_file = _get_user_env_file()
    env_file.parent.mkdir(parents=True, exist_ok=True)

    if not env_file.exists():
        example = data_dir / ".env.example"
        if example.exists():
            shutil.copy(example, env_file)
            content = env_file.read_text(encoding="utf-8")
            # Replace placeholder keys with real random values
            content = content.replace(
                "change-this-to-a-long-random-string-in-production",
                secrets.token_hex(32),
            )
            env_file.write_text(content, encoding="utf-8")
            logger.info(f"Created production .env at {env_file}")
        else:
            logger.warning("Bundled .env.example not found; starting without .env")

    return env_file


def main():
    data_dir = _resolve_data_dir()

    # Add bundled app to sys.path so 'app.*' imports work
    if str(data_dir) not in sys.path:
        sys.path.insert(0, str(data_dir))

    # Load persistent .env before any app modules are imported
    env_file = _ensure_env(data_dir)
    if env_file.exists():
        from dotenv import load_dotenv
        load_dotenv(env_file, override=False)
        logger.info(f"Loaded .env from {env_file}")

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))

    logger.info(f"IntelliLaw backend starting on {host}:{port}")

    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        reload=False,
    )


if __name__ == "__main__":
    main()
