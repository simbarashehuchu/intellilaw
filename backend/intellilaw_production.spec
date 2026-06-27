# -*- mode: python ; coding: utf-8 -*-
# IntelliLaw — PyInstaller spec  (one-file exe, Windows x64)

import sys
from pathlib import Path

BACKEND_DIR = Path(SPECPATH)
FRONTEND_DIST = BACKEND_DIR.parent / "frontend" / "dist"

block_cipher = None

a = Analysis(
    [str(BACKEND_DIR / "launcher.py")],
    pathex=[str(BACKEND_DIR)],
    binaries=[],
    datas=[
        # Bundle the React build so the backend can serve it if needed
        (str(FRONTEND_DIST), "frontend/dist"),
        # .env.example as a template for first-run key generation
        (str(BACKEND_DIR / ".env.example"), "."),
    ],
    hiddenimports=[
        # FastAPI / Starlette internals
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.http.httptools_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.protocols.websockets.websockets_impl",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "starlette.routing",
        "fastapi.routing",
        # SQLAlchemy dialects
        "sqlalchemy.dialects.sqlite",
        "sqlalchemy.pool",
        # App modules
        "app.main",
        "app.auth",
        "app.database",
        "app.models",
        "app.legal_models",
        "app.legal_prompts",
        "app.conflict_service",
        "app.gl_service",
        "app.local_llm_service",
        "app.demo_mode",
        "app.model_registry",
        "app.tenant",
        # Auth / crypto
        "jose",
        "jose.jwt",
        "passlib.handlers.bcrypt",
        "passlib.handlers.pbkdf2",
        "cryptography",
        "pyotp",
        "qrcode",
        "qrcode.image.pil",
        # Data / docs
        "PIL",
        "PIL.Image",
        "pdfplumber",
        "pypdf",
        "docx",
        "openpyxl",
        "pandas",
        "numpy",
        "aiofiles",
        "email_validator",
        "anthropic",
        "multipart",
        "dotenv",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "matplotlib",
        "scipy",
        "IPython",
        "jupyter",
        "notebook",
        "pytest",
        "black",
        "mypy",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="IntelliLaw-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,       # Keep console so Electron can read stdout/stderr
    disable_windowed_traceback=False,
    target_arch="x86_64",
    codesign_identity=None,
    entitlements_file=None,
    icon=str(BACKEND_DIR.parent / "frontend" / "assets" / "icon.ico"),
)
