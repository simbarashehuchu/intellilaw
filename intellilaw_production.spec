# -*- mode: python ; coding: utf-8 -*-
# IntelliLaw Production Build Spec  v2.0
# Fixes vs original:
#   - PyPDF2  replaced with pypdf (requirements.txt uses pypdf>=4.0)
#   - Added missing hiddenimports: gl_service, conflict_service,
#     pyotp, qrcode, sqlalchemy dialects, aiofiles, email_validator
#   - SQLCipher handled gracefully (falls back to sqlite3 on failure)
#   - Added pywebview platform backends for Windows

import sys
from pathlib import Path

block_cipher = None

a = Analysis(
    ['launcher.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('.env',              '.'),
        ('app',               'app'),
        ('../frontend/dist',  'frontend'),
    ],
    hiddenimports=[
        # ── FastAPI / Uvicorn ────────────────────────────────────
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'fastapi.middleware',
        'fastapi.middleware.cors',
        'starlette',
        'starlette.middleware',
        'starlette.staticfiles',
        'starlette.responses',
        'multipart',
        'python_multipart',

        # ── Authentication ───────────────────────────────────────
        'jose',
        'jose.jwt',
        'passlib',
        'passlib.handlers.bcrypt',
        'bcrypt',
        'cryptography',
        'cryptography.fernet',
        'pyotp',
        'qrcode',
        'qrcode.image.pil',

        # ── Database ─────────────────────────────────────────────
        'sqlalchemy',
        'sqlalchemy.orm',
        'sqlalchemy.ext.declarative',
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.dialects.sqlite.pysqlite',
        'sqlalchemy.pool',

        # ── Document processing ──────────────────────────────────
        # NOTE: PyPDF2 was renamed to pypdf — use pypdf here
        'pypdf',
        'pdfplumber',
        'docx',
        'openpyxl',
        'PIL',
        'PIL.Image',
        'PIL.ImageDraw',
        'PIL.ImageFont',

        # ── App modules ──────────────────────────────────────────
        'app.main',
        'app.models',
        'app.legal_models',
        'app.database',
        'app.auth',
        'app.demo_mode',
        'app.legal_prompts',
        'app.tenant',
        'app.local_llm_service',
        'app.model_registry',
        'app.gl_service',
        'app.conflict_service',

        # ── Networking / async ───────────────────────────────────
        'email_validator',
        'pydantic',
        'pydantic.v1',
        'dotenv',
        'requests',
        'httpx',
        'aiofiles',
        'anyio',
        'anyio._backends._asyncio',
        'h11',

        # ── AI / Anthropic ───────────────────────────────────────
        'anthropic',

        # ── WebView (Windows) ────────────────────────────────────
        'webview',
        'webview.platforms.winforms',
        'webview.platforms.edgechromium',
        'clr',

        # ── Utilities ────────────────────────────────────────────
        'pandas',
        'numpy',
        'aiohttp',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'pytest', 'black', 'flake8', 'mypy', 'alembic',
        'tkinter', 'matplotlib', 'scipy', 'IPython',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz, a.scripts, [],
    exclude_binaries=True,
    name='IntelliLaw-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,           # keep True so launcher logs are visible in electron.log
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../frontend/assets/icon.ico',
)

coll = COLLECT(
    exe, a.binaries, a.zipfiles, a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='IntelliLaw',
)
