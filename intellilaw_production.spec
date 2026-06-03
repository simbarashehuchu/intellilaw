# -*- mode: python ; coding: utf-8 -*-
# IntelliLaw Production Build Spec

import sys
from pathlib import Path

block_cipher = None

a = Analysis(
    ['launcher.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('.env', '.'),
        ('app', 'app'),
        ('../frontend/dist', 'frontend'),
    ],
    hiddenimports=[
        # FastAPI / Uvicorn
        'uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
        'uvicorn.protocols', 'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan',
        'uvicorn.lifespan.on', 'fastapi', 'starlette',
        'multipart', 'python_multipart',
        # Auth
        'jose', 'jose.jwt', 'passlib', 'passlib.handlers.bcrypt',
        'bcrypt', 'cryptography',
        # Database
        'sqlalchemy', 'sqlalchemy.dialects.sqlite',
        # Document processing
        'PyPDF2', 'pdfplumber', 'docx', 'openpyxl',
        'PIL', 'PIL.Image',
        # App modules
        'app.main', 'app.models', 'app.legal_models',
        'app.database', 'app.auth', 'app.demo_mode',
        'app.legal_prompts', 'app.tenant',
        'app.local_llm_service', 'app.model_registry',
        # Misc
        'email_validator', 'pydantic', 'dotenv',
        'requests', 'httpx', 'aiofiles',
        'anthropic',
        # WebView
        'webview',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['pytest', 'black', 'flake8', 'mypy', 'alembic'],
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
    console=False,
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
