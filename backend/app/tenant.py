import os
from pathlib import Path

BASE_DIR = Path.home() / "IntelliLaw" / "firms"

def get_firm_id() -> str:
    return os.getenv("FIRM_ID", "default")

def get_firm_dir() -> Path:
    d = BASE_DIR / get_firm_id()
    d.mkdir(parents=True, exist_ok=True)
    return d

# Alias for compatibility with local_llm_service
def get_school_dir() -> Path:
    return get_firm_dir()
