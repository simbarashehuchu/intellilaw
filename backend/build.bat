@echo off
REM ================================================================
REM  IntelliLaw — Production Build Script  v2.0
REM  IGLA Centre for AI & Digital Transformation
REM ================================================================
REM  Run from:  intellilaw\backend\
REM  Produces:  frontend\release\IntelliLaw-Setup-x.x.x.exe
REM
REM  FIXES vs v1.0
REM  - Correct build order: Frontend -> PyInstaller -> Electron
REM    (v1 built PyInstaller before Vite, breaking spec datas embed)
REM  - Python 3.9-3.13 version gate (3.14+ breaks numpy/SQLAlchemy)
REM  - Node 18+ version gate
REM  - Secure SECRET_KEY + DB_ENCRYPTION_KEY auto-generated
REM  - INTELLILAW_SERVER_ONLY env-var fix in main.cjs
REM  - Build log written to build_output.log
REM  - Final installer size reported
REM ================================================================
setlocal enabledelayedexpansion

set APP_NAME=IntelliLaw
set APP_VERSION=1.0.0
set LAN_PORT=8000

REM ── Directories ─────────────────────────────────────────────────
set BACKEND_DIR=%~dp0
if "!BACKEND_DIR:~-1!"=="\" set BACKEND_DIR=!BACKEND_DIR:~0,-1!
set FRONTEND_DIR=!BACKEND_DIR!\..\frontend
set PYINSTALLER_DIST=!BACKEND_DIR!\dist
set BACKEND_DIST=!BACKEND_DIR!\backend-dist
set ENV_FILE=!BACKEND_DIR!\.env
set ENV_BACKUP=!BACKEND_DIR!\.env.dev.bak
set LOG_FILE=!BACKEND_DIR!\build_output.log
set MAIN_CJS=!FRONTEND_DIR!\main.cjs
set MAIN_CJS_BAK=!FRONTEND_DIR!\main.cjs.bak

REM ── Initialise log ──────────────────────────────────────────────
echo IntelliLaw Production Build v2.0 > "!LOG_FILE!"
echo Started: %date% %time% >> "!LOG_FILE!"
echo Backend:  !BACKEND_DIR! >> "!LOG_FILE!"
echo Frontend: !FRONTEND_DIR! >> "!LOG_FILE!"
echo. >> "!LOG_FILE!"

echo.
echo ================================================================
echo   %APP_NAME% v%APP_VERSION% — Production Build
echo ================================================================
echo   Log: !LOG_FILE!
echo.

REM ================================================================
REM  STEP 1 — PRE-FLIGHT CHECKS
REM ================================================================
echo [1/6] Pre-flight checks...

REM ── Python ──────────────────────────────────────────────────────
python --version >nul 2>&1
if !errorlevel! NEQ 0 (
    echo.
    echo   [ERROR] Python not found in PATH.
    echo   Fix:    Install Python 3.9-3.13 from https://python.org
    echo           Tick "Add Python to PATH" during install.
    echo           Then close and reopen this terminal.
    pause & exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
for /f "tokens=1,2 delims=." %%a in ("!PYVER!") do (
    set PY_MAJ=%%a
    set PY_MIN=%%b
)
if !PY_MAJ! NEQ 3 (
    echo   [ERROR] Python 3 required. Found: Python !PYVER!
    pause & exit /b 1
)
if !PY_MIN! LSS 9 (
    echo   [ERROR] Python 3.9 minimum required. Found: Python !PYVER!
    echo   Fix:    Install Python 3.9-3.13 from https://python.org
    pause & exit /b 1
)
if !PY_MIN! GTR 13 (
    echo   [ERROR] Python !PYVER! is NOT supported.
    echo   Reason: numpy and SQLAlchemy are incompatible with Python 3.14+.
    echo   Fix:    Install Python 3.9-3.13 alongside — use py -3.11 to select.
    pause & exit /b 1
)
echo   [OK] Python !PYVER!
echo Python !PYVER! >> "!LOG_FILE!"

REM ── Node.js ─────────────────────────────────────────────────────
node --version >nul 2>&1
if !errorlevel! NEQ 0 (
    echo.
    echo   [ERROR] Node.js not found in PATH.
    echo   Fix:    Install Node.js 18+ from https://nodejs.org
    pause & exit /b 1
)
for /f %%v in ('node --version 2^>^&1') do set NODEVER=%%v
for /f "tokens=1 delims=." %%m in ("!NODEVER:v=!") do set NODE_MAJ=%%m
if !NODE_MAJ! LSS 18 (
    echo   [ERROR] Node.js 18+ required. Found: !NODEVER!
    echo   Fix:    Install Node.js LTS from https://nodejs.org
    pause & exit /b 1
)
echo   [OK] Node.js !NODEVER!
echo Node.js !NODEVER! >> "!LOG_FILE!"

REM ── npm ─────────────────────────────────────────────────────────
npm --version >nul 2>&1
if !errorlevel! NEQ 0 (
    echo   [ERROR] npm not found. Reinstall Node.js.
    pause & exit /b 1
)
echo   [OK] npm

REM ── Required files ──────────────────────────────────────────────
set MISSING=0
if not exist "!BACKEND_DIR!\launcher.py"                ( echo   [ERROR] Missing: backend\launcher.py                & set MISSING=1 )
if not exist "!BACKEND_DIR!\app\main.py"                ( echo   [ERROR] Missing: backend\app\main.py                & set MISSING=1 )
if not exist "!BACKEND_DIR!\app\database.py"            ( echo   [ERROR] Missing: backend\app\database.py            & set MISSING=1 )
if not exist "!BACKEND_DIR!\app\models.py"              ( echo   [ERROR] Missing: backend\app\models.py              & set MISSING=1 )
if not exist "!BACKEND_DIR!\intellilaw_production.spec" ( echo   [ERROR] Missing: backend\intellilaw_production.spec & set MISSING=1 )
if not exist "!BACKEND_DIR!\requirements.txt"           ( echo   [ERROR] Missing: backend\requirements.txt           & set MISSING=1 )
if not exist "!FRONTEND_DIR!\package.json"              ( echo   [ERROR] Missing: frontend\package.json              & set MISSING=1 )
if not exist "!FRONTEND_DIR!\src\App.jsx"               ( echo   [ERROR] Missing: frontend\src\App.jsx               & set MISSING=1 )
if not exist "!MAIN_CJS!"                               ( echo   [ERROR] Missing: frontend\main.cjs                  & set MISSING=1 )
if not exist "!ENV_FILE!" (
    if exist "!BACKEND_DIR!\.env.example" (
        echo   [INFO]  .env not found — copying from .env.example
        copy "!BACKEND_DIR!\.env.example" "!ENV_FILE!" >nul
    ) else (
        echo   [ERROR] Missing: backend\.env  (and no .env.example to copy from)
        set MISSING=1
    )
)
if !MISSING! NEQ 0 (
    echo.
    echo   One or more required files are missing.
    echo   Make sure you are running build.bat from intellilaw\backend\
    pause & exit /b 1
)
echo   [OK] All required files present
echo Pre-flight PASSED >> "!LOG_FILE!"

REM ================================================================
REM  STEP 2 — CLEAN PREVIOUS BUILD ARTIFACTS
REM ================================================================
echo.
echo [2/6] Cleaning previous build artifacts...
if exist "!BACKEND_DIR!\build"         rmdir /s /q "!BACKEND_DIR!\build"         >nul 2>&1
if exist "!PYINSTALLER_DIST!"          rmdir /s /q "!PYINSTALLER_DIST!"          >nul 2>&1
if exist "!BACKEND_DIST!"              rmdir /s /q "!BACKEND_DIST!"              >nul 2>&1
if exist "!FRONTEND_DIR!\dist"         rmdir /s /q "!FRONTEND_DIR!\dist"         >nul 2>&1
if exist "!FRONTEND_DIR!\release"      del /q "!FRONTEND_DIR!\release\*.exe"     >nul 2>&1
echo   [OK] Clean complete
echo Clean DONE >> "!LOG_FILE!"

REM ================================================================
REM  STEP 3 — PYTHON ENVIRONMENT + DEPENDENCIES
REM ================================================================
echo.
echo [3/6] Python environment...

if not exist "!BACKEND_DIR!\venv" (
    echo   Creating virtual environment...
    python -m venv "!BACKEND_DIR!\venv"
    if !errorlevel! NEQ 0 (
        echo   [ERROR] Failed to create venv.
        echo   Fix:    Run: python -m venv venv
        pause & exit /b 1
    )
)
call "!BACKEND_DIR!\venv\Scripts\activate.bat"

echo   Upgrading pip...
python -m pip install --upgrade pip --quiet >> "!LOG_FILE!" 2>&1

echo   Installing requirements (may take several minutes on first run)...
pip install -r "!BACKEND_DIR!\requirements.txt" >> "!LOG_FILE!" 2>&1
if !errorlevel! NEQ 0 (
    echo   [ERROR] pip install failed.
    echo   Fix:    Open build_output.log and look for the failing package.
    echo           Common causes: network error, incompatible package, wrong Python version.
    call "!BACKEND_DIR!\venv\Scripts\deactivate.bat"
    pause & exit /b 1
)

echo   Installing PyInstaller...
pip install "pyinstaller>=6.4,<7" --quiet >> "!LOG_FILE!" 2>&1
if !errorlevel! NEQ 0 (
    echo   [ERROR] PyInstaller install failed — see build_output.log
    call "!BACKEND_DIR!\venv\Scripts\deactivate.bat"
    pause & exit /b 1
)

echo   Installing pywebview (desktop window)...
pip install pywebview==4.4.1 --quiet >> "!LOG_FILE!" 2>&1
if !errorlevel! NEQ 0 (
    echo   [WARN]  pywebview install failed (non-fatal for LAN/server deployments).
    echo           Desktop window will use Electron shell only.
    echo pywebview FAILED >> "!LOG_FILE!"
)

echo   [OK] Python environment ready
echo Python deps DONE >> "!LOG_FILE!"

REM ================================================================
REM  STEP 4a — GENERATE PRODUCTION .ENV
REM ================================================================
echo.
echo [4a/6] Generating production environment...

REM Back up dev .env
copy "!ENV_FILE!" "!ENV_BACKUP!" >nul
echo Dev .env backed up to .env.dev.bak >> "!LOG_FILE!"

REM Generate cryptographically secure keys
for /f %%k in ('python -c "import secrets; print(secrets.token_hex(32))"') do set NEW_SECRET=%%k
for /f %%k in ('python -c "import secrets; print(secrets.token_hex(32))"') do set NEW_DBKEY=%%k

REM Write production .env
(
echo # IntelliLaw — Production Environment
echo # Auto-generated by build.bat on %date% %time%
echo # -----------------------------------------------
echo # SECURITY: Change DEFAULT_ADMIN_PASSWORD before
echo # distributing this installer to clients.
echo # Keep DB_ENCRYPTION_KEY safe — losing it means
echo # losing access to all encrypted database files.
echo # -----------------------------------------------
echo.
echo APP_NAME=IntelliLaw
echo FIRM_ID=default
echo.
echo # Server
echo HOST=0.0.0.0
echo PORT=%LAN_PORT%
echo CORS_ORIGINS=*
echo.
echo # Security — auto-generated (do not edit these)
echo SECRET_KEY=!NEW_SECRET!
echo DB_ENCRYPTION_KEY=!NEW_DBKEY!
echo.
echo # Session
echo ACCESS_TOKEN_EXPIRE_MINUTES=1440
echo IDLE_TIMEOUT_MINUTES=15
echo.
echo # Default admin account created on first launch
echo DEFAULT_ADMIN_USERNAME=admin
echo DEFAULT_ADMIN_EMAIL=admin@intellilaw.local
echo DEFAULT_ADMIN_PASSWORD=Admin123!
echo.
echo # AI — local GGUF model (offline mode)
echo # Place your .gguf model in:
echo # %%USERPROFILE%%\IntelliLaw\firms\default\models\
echo DEFAULT_MODEL=qwen2.5-1.5b-instruct-q4_k_m.gguf
echo MODEL_FORMAT=qwen
echo LLM_CONTEXT_WINDOW=4096
echo LLM_THREADS=4
echo LLM_GPU_LAYERS=0
echo.
echo # Cloud AI fallback (set DEMO_MODE=true + add API key to use Anthropic)
echo DEMO_MODE=false
echo ANTHROPIC_API_KEY=
) > "!ENV_FILE!"

echo   [OK] Production .env created (SECRET_KEY auto-generated)
echo Production .env written >> "!LOG_FILE!"

REM ================================================================
REM  STEP 4b — PATCH main.cjs (INTELLILAW_SERVER_ONLY fix)
REM ================================================================
echo   Patching main.cjs (env-var fix)...
copy "!MAIN_CJS!" "!MAIN_CJS_BAK!" >nul
powershell -NoProfile -Command ^
    "(Get-Content '!MAIN_CJS!') -replace 'INTELLISCHOOL_SERVER_ONLY', 'INTELLILAW_SERVER_ONLY' | Set-Content '!MAIN_CJS!'"
echo   [OK] main.cjs patched
echo main.cjs patched >> "!LOG_FILE!"

REM ================================================================
REM  STEP 5a — BUILD VITE FRONTEND  (MUST be before PyInstaller)
REM  The .spec file embeds ../frontend/dist into the Python binary.
REM  Building PyInstaller before this step causes an empty embed.
REM ================================================================
echo.
echo [5a/6] Building React frontend (Vite)...
pushd "!FRONTEND_DIR!"

echo   npm install...
call npm install --prefer-offline --no-audit --no-fund >> "!LOG_FILE!" 2>&1
if !errorlevel! NEQ 0 (
    echo   [ERROR] npm install failed — see build_output.log
    popd & goto :fail
)

echo   npm run build...
call npm run build >> "!LOG_FILE!" 2>&1
set VITE_RESULT=!errorlevel!
popd

if !VITE_RESULT! NEQ 0 (
    echo   [ERROR] Vite build failed — see build_output.log
    echo   Tip:    Run  cd frontend ^& npm run build  to see the full error.
    goto :fail
)
if not exist "!FRONTEND_DIR!\dist\index.html" (
    echo   [ERROR] Frontend build produced no output (dist\index.html missing).
    goto :fail
)
echo   [OK] Frontend built: frontend\dist\
echo Vite build DONE >> "!LOG_FILE!"

REM ================================================================
REM  STEP 5b — BUILD PYTHON BACKEND (PyInstaller)
REM  Runs after Vite so frontend\dist exists for the spec to embed.
REM ================================================================
echo.
echo [5b/6] Building Python backend (PyInstaller — takes 3-8 min)...
echo PyInstaller starting >> "!LOG_FILE!"

pyinstaller --clean --noconfirm "!BACKEND_DIR!\intellilaw_production.spec" >> "!LOG_FILE!" 2>&1
set PYI_RESULT=!errorlevel!

if !PYI_RESULT! NEQ 0 (
    echo   [ERROR] PyInstaller failed — see build_output.log
    echo   Tips:
    echo     - Missing module: add to hiddenimports in intellilaw_production.spec
    echo     - Import error:   run  python launcher.py  to see the error
    echo     - Path error:     check datas list in .spec (frontend\dist must exist)
    goto :fail
)

REM Locate the exe (single-file or single-dir mode)
set BACKEND_EXE=
if exist "!PYINSTALLER_DIST!\IntelliLaw-backend.exe" set BACKEND_EXE=!PYINSTALLER_DIST!\IntelliLaw-backend.exe
if exist "!PYINSTALLER_DIST!\IntelliLaw\IntelliLaw-backend.exe" set BACKEND_EXE=!PYINSTALLER_DIST!\IntelliLaw\IntelliLaw-backend.exe
if not defined BACKEND_EXE (
    echo   [ERROR] IntelliLaw-backend.exe not found after PyInstaller build.
    echo   Check build_output.log for details.
    goto :fail
)

REM Copy to backend-dist (location referenced by electron-builder extraResources)
if exist "!BACKEND_DIST!" rmdir /s /q "!BACKEND_DIST!"
mkdir "!BACKEND_DIST!"
if exist "!PYINSTALLER_DIST!\IntelliLaw\" (
    xcopy /s /q "!PYINSTALLER_DIST!\IntelliLaw\*" "!BACKEND_DIST!\" >> "!LOG_FILE!" 2>&1
) else (
    copy "!BACKEND_EXE!" "!BACKEND_DIST!\IntelliLaw-backend.exe" >nul
)
echo   [OK] Backend built: backend-dist\IntelliLaw-backend.exe
echo PyInstaller DONE >> "!LOG_FILE!"

REM ================================================================
REM  STEP 6 — BUILD ELECTRON NSIS INSTALLER
REM ================================================================
echo.
echo [6/6] Building Electron installer (NSIS — takes 2-5 min)...
pushd "!FRONTEND_DIR!"
call npx electron-builder --win --x64 --publish never >> "!LOG_FILE!" 2>&1
set EB_RESULT=!errorlevel!
popd

if !EB_RESULT! NEQ 0 (
    echo   [ERROR] electron-builder failed — see build_output.log
    echo   Tip:    Make sure assets\icon.ico exists in frontend\assets\
    goto :fail
)

REM Find installer
set INSTALLER=
for /f %%f in ('dir /b /o-d "!FRONTEND_DIR!\release\*.exe" 2^>nul') do (
    if not defined INSTALLER set INSTALLER=!FRONTEND_DIR!\release\%%f
)
if not defined INSTALLER (
    echo   [ERROR] No .exe found in frontend\release\
    goto :fail
)

REM ================================================================
REM  RESTORE DEV .ENV AND main.cjs
REM ================================================================
copy "!ENV_BACKUP!" "!ENV_FILE!" >nul & del "!ENV_BACKUP!"
copy "!MAIN_CJS_BAK!" "!MAIN_CJS!" >nul & del "!MAIN_CJS_BAK!"
echo Dev .env and main.cjs restored >> "!LOG_FILE!"

REM ── File size ────────────────────────────────────────────────────
for %%f in ("!INSTALLER!") do set INS_BYTES=%%~zf
set /a INS_MB=!INS_BYTES! / 1048576

REM ================================================================
REM  SUCCESS
REM ================================================================
echo.
echo ================================================================
echo   BUILD SUCCESSFUL
echo ================================================================
echo.
echo   Installer : !INSTALLER!
echo   Size      : ~!INS_MB! MB
echo   Log       : !LOG_FILE!
echo.
echo   ─── Before distributing to a client ──────────────────────
echo   1. Change DEFAULT_ADMIN_PASSWORD in backend\.env
echo   2. Set FIRM_ID to a unique code for the firm (e.g. MHLANGA)
echo   3. Keep the generated DB_ENCRYPTION_KEY — losing it means
echo      losing access to all encrypted databases
echo   4. Drop the .gguf AI model in:
echo      %%USERPROFILE%%\IntelliLaw\firms\<FIRM_ID>\models\
echo   ──────────────────────────────────────────────────────────
echo.
echo   Default first login: admin / Admin123!
echo.
echo BUILD COMPLETE >> "!LOG_FILE!"
echo Installer: !INSTALLER! (!INS_MB! MB) >> "!LOG_FILE!"
call "!BACKEND_DIR!\venv\Scripts\deactivate.bat" 2>nul
pause
endlocal
exit /b 0

REM ================================================================
REM  FAILURE — restore .env and main.cjs before exiting
REM ================================================================
:fail
echo.
if exist "!ENV_BACKUP!"    ( copy "!ENV_BACKUP!" "!ENV_FILE!" >nul    & del "!ENV_BACKUP!"    )
if exist "!MAIN_CJS_BAK!"  ( copy "!MAIN_CJS_BAK!" "!MAIN_CJS!" >nul & del "!MAIN_CJS_BAK!"  )
echo   Dev .env and main.cjs restored after failure.
call "!BACKEND_DIR!\venv\Scripts\deactivate.bat" 2>nul
echo BUILD FAILED >> "!LOG_FILE!"
echo.
echo   Full build log: !LOG_FILE!
echo.
pause
endlocal
exit /b 1
