@echo off
REM ================================================================
REM  IntelliLaw — Production Build Script  v2.2
REM  IGLA Centre for AI & Digital Transformation
REM ================================================================
REM  Run from:  intellilaw\backend\
REM  Produces:  ..\frontend\release\IntelliLaw-Setup-x.x.x.exe
REM
REM  Run as:    build.bat
REM  On error:  last 30 lines of build_output.log are printed
REM ================================================================
setlocal enabledelayedexpansion

set APP_NAME=IntelliLaw
set APP_VERSION=1.0.0
set LAN_PORT=8000

REM ── Directories ─────────────────────────────────────────────────
set BACKEND_DIR=%~dp0
if "!BACKEND_DIR:~-1!"=="\" set BACKEND_DIR=!BACKEND_DIR:~0,-1!
set FRONTEND_DIR=!BACKEND_DIR!\..\frontend
set DIST_DIR=!BACKEND_DIR!\dist
set BACKEND_DIST=!BACKEND_DIR!\backend-dist
set ENV_FILE=!BACKEND_DIR!\.env
set ENV_BACKUP=!BACKEND_DIR!\.env.build.bak
set LOG=!BACKEND_DIR!\build_output.log
set MAIN_CJS=!FRONTEND_DIR!\main.cjs
set MAIN_CJS_BAK=!FRONTEND_DIR!\main.cjs.build.bak

echo IntelliLaw Build v2.2  %date% %time% > "!LOG!"
echo Backend:  !BACKEND_DIR!   >> "!LOG!"
echo Frontend: !FRONTEND_DIR!  >> "!LOG!"
echo. >> "!LOG!"

echo.
echo ================================================================
echo   %APP_NAME% v%APP_VERSION%  —  Production Build
echo ================================================================
echo   Log: !LOG!
echo.

REM ================================================================
REM  STEP 1  Pre-flight checks
REM ================================================================
echo [1/6] Pre-flight checks...

REM Python — prefer 3.11 via py launcher (system default may be 3.14+)
set PYTHON_EXE=
py -3.11 --version > nul 2>&1
if !errorlevel! EQU 0 (
    for /f "tokens=*" %%p in ('py -3.11 -c "import sys; print(sys.executable)"') do set PYTHON_EXE=%%p
    echo   [INFO] Using Python 3.11: !PYTHON_EXE!
)
if not defined PYTHON_EXE set PYTHON_EXE=python

if not defined PYTHON_EXE (
    echo   [ERROR] Python 3.11 not found. Install from https://python.org
    pause & exit /b 1
)
REM We already confirmed 3.11 via py -3.11 detection above
set PYVER=3.11
echo   [OK] Python !PYVER!
echo Python !PYVER! >> "!LOG!"

REM Node.js
for /f "tokens=*" %%v in ('node --version 2^>^&1') do set NODEVER=%%v
if not defined NODEVER ( echo   [ERROR] Node.js not found. Install from https://nodejs.org & pause & exit /b 1 )
for /f "tokens=1 delims=." %%m in ("!NODEVER:v=!") do set NODE_MAJ=%%m
if !NODE_MAJ! LSS 18 ( echo   [ERROR] Node.js 18+ required. Found: !NODEVER! & pause & exit /b 1 )
echo   [OK] Node.js !NODEVER!
echo Node.js !NODEVER! >> "!LOG!"

REM npm  (npm is npm.cmd — must use CALL or outer script silently exits)
for /f "tokens=*" %%v in ('call npm --version 2^>^&1') do set NPMVER=%%v
if not defined NPMVER ( echo   [ERROR] npm not found. Reinstall Node.js. & pause & exit /b 1 )
echo   [OK] npm !NPMVER!
echo npm !NPMVER! >> "!LOG!"

REM Required files
set MISSING=0
if not exist "!BACKEND_DIR!\launcher.py"                  ( echo   [MISSING] launcher.py                  & set MISSING=1 )
if not exist "!BACKEND_DIR!\app\main.py"                  ( echo   [MISSING] app\main.py                  & set MISSING=1 )
if not exist "!BACKEND_DIR!\app\database.py"              ( echo   [MISSING] app\database.py              & set MISSING=1 )
if not exist "!BACKEND_DIR!\intellilaw_production.spec"   ( echo   [MISSING] intellilaw_production.spec   & set MISSING=1 )
if not exist "!BACKEND_DIR!\requirements.txt"             ( echo   [MISSING] requirements.txt             & set MISSING=1 )
if not exist "!FRONTEND_DIR!\package.json"                ( echo   [MISSING] frontend\package.json        & set MISSING=1 )
if not exist "!FRONTEND_DIR!\src\App.jsx"                 ( echo   [MISSING] frontend\src\App.jsx         & set MISSING=1 )
if not exist "!MAIN_CJS!"                                 ( echo   [MISSING] frontend\main.cjs            & set MISSING=1 )
if not exist "!FRONTEND_DIR!\assets\icon.ico"             ( echo   [WARN]    frontend\assets\icon.ico not found — build may fail & echo icon.ico missing >> "!LOG!" )
if not exist "!ENV_FILE!" (
    if exist "!BACKEND_DIR!\.env.example" (
        echo   [INFO] No .env found — copying .env.example
        copy "!BACKEND_DIR!\.env.example" "!ENV_FILE!" >nul
    ) else (
        echo   [MISSING] .env  (and no .env.example to copy from^)
        set MISSING=1
    )
)
if !MISSING! NEQ 0 (
    echo   One or more files are missing. Run from intellilaw\backend\.
    pause & exit /b 1
)
echo   [OK] All required files present
echo Pre-flight PASSED >> "!LOG!"

REM ================================================================
REM  STEP 2  Clean
REM ================================================================
echo.
echo [2/6] Cleaning previous build...
if exist "!BACKEND_DIR!\build"  rmdir /s /q "!BACKEND_DIR!\build"  >nul 2>&1
if exist "!DIST_DIR!"           rmdir /s /q "!DIST_DIR!"           >nul 2>&1
if exist "!BACKEND_DIST!"       rmdir /s /q "!BACKEND_DIST!"       >nul 2>&1
if exist "!FRONTEND_DIR!\dist"  rmdir /s /q "!FRONTEND_DIR!\dist"  >nul 2>&1
if exist "!FRONTEND_DIR!\release" del /q "!FRONTEND_DIR!\release\*.exe" >nul 2>&1
echo   [OK] Clean complete
echo Clean DONE >> "!LOG!"

REM ================================================================
REM  STEP 3  Python venv + dependencies
REM  pip / pyinstaller are .cmd files — always use CALL
REM ================================================================
echo.
echo [3/6] Python environment...

if not exist "!BACKEND_DIR!\venv" (
    echo   Creating venv...
    "!PYTHON_EXE!" -m venv "!BACKEND_DIR!\venv"
    set ERR=!errorlevel!
    if !ERR! NEQ 0 ( echo   [ERROR] venv creation failed & pause & exit /b 1 )
)
call "!BACKEND_DIR!\venv\Scripts\activate.bat"

echo   pip upgrade...
call python -m pip install --upgrade pip --quiet >> "!LOG!" 2>&1

echo   pip install requirements (may take a few minutes)...
call pip install -r "!BACKEND_DIR!\requirements.txt" >> "!LOG!" 2>&1
set ERR=!errorlevel!
if !ERR! NEQ 0 (
    echo   [ERROR] pip install requirements failed.
    goto :show_tail_and_fail
)

echo   pip install PyInstaller...
call pip install "pyinstaller>=6.4,<7" --quiet >> "!LOG!" 2>&1
set ERR=!errorlevel!
if !ERR! NEQ 0 ( echo   [ERROR] PyInstaller install failed & goto :show_tail_and_fail )

echo   pip install llama-cpp-python (offline AI)...
call pip install "llama-cpp-python==0.3.0" --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu --quiet >> "!LOG!" 2>&1
set ERR=!errorlevel!
if !ERR! NEQ 0 ( echo   [ERROR] llama-cpp-python install failed & goto :show_tail_and_fail )

echo   pip install pywebview...
call pip install pywebview==4.4.1 --quiet >> "!LOG!" 2>&1
set ERR=!errorlevel!
if !ERR! NEQ 0 (
    echo   [WARN] pywebview failed (non-fatal — Electron shell still works^)
    echo pywebview FAILED >> "!LOG!"
)

echo   [OK] Python environment ready
echo Python deps DONE >> "!LOG!"

REM ================================================================
REM  STEP 4a  Production .env
REM ================================================================
echo.
echo [4a/6] Generating production .env...
copy "!ENV_FILE!" "!ENV_BACKUP!" >nul

for /f %%k in ('python -c "import secrets; print(secrets.token_hex(32))"') do set SK=%%k
for /f %%k in ('python -c "import secrets; print(secrets.token_hex(32))"') do set DK=%%k

(
echo # IntelliLaw Production  —  generated %date% %time%
echo # CHANGE DEFAULT_ADMIN_PASSWORD before distributing.
echo # Back up DB_ENCRYPTION_KEY — losing it = losing all data.
echo.
echo APP_NAME=IntelliLaw
echo FIRM_ID=default
echo HOST=0.0.0.0
echo PORT=%LAN_PORT%
echo CORS_ORIGINS=*
echo SECRET_KEY=!SK!
echo DB_ENCRYPTION_KEY=!DK!
echo ACCESS_TOKEN_EXPIRE_MINUTES=1440
echo IDLE_TIMEOUT_MINUTES=15
echo DEFAULT_ADMIN_USERNAME=admin
echo DEFAULT_ADMIN_EMAIL=admin@intellilaw.local
echo DEFAULT_ADMIN_PASSWORD=Admin123!
echo DEFAULT_MODEL=qwen2.5-1.5b-instruct-q4_k_m.gguf
echo MODEL_FORMAT=qwen
echo LLM_CONTEXT_WINDOW=4096
echo LLM_THREADS=4
echo LLM_GPU_LAYERS=0
echo DEMO_MODE=false
echo ANTHROPIC_API_KEY=
) > "!ENV_FILE!"

echo   [OK] Production .env written
echo .env written >> "!LOG!"

REM ================================================================
REM  STEP 4b  Patch main.cjs  (fix wrong env-var name)
REM ================================================================
echo   Patching main.cjs...
copy "!MAIN_CJS!" "!MAIN_CJS_BAK!" >nul
powershell -NoProfile -Command ^
  "(Get-Content '!MAIN_CJS!') -replace 'INTELLISCHOOL_SERVER_ONLY','INTELLILAW_SERVER_ONLY' | Set-Content '!MAIN_CJS!'"
echo   [OK] main.cjs patched
echo main.cjs patched >> "!LOG!"

REM ================================================================
REM  STEP 5a  Vite frontend  *** MUST run before PyInstaller ***
REM  spec datas includes ../frontend/dist — must exist first
REM ================================================================
echo.
echo [5a/6] Building React frontend (Vite)...
pushd "!FRONTEND_DIR!"

echo   npm install...
call npm install --prefer-offline --no-audit --no-fund >> "!LOG!" 2>&1
set ERR=!errorlevel!
if !ERR! NEQ 0 ( popd & echo   [ERROR] npm install failed & goto :show_tail_and_fail )

echo   npm run build...
call npm run build >> "!LOG!" 2>&1
set VITE_ERR=!errorlevel!
popd

if !VITE_ERR! NEQ 0 ( echo   [ERROR] Vite build failed & goto :show_tail_and_fail )
if not exist "!FRONTEND_DIR!\dist\index.html" (
    echo   [ERROR] dist\index.html missing after Vite build
    goto :show_tail_and_fail
)
echo   [OK] Frontend built
echo Vite DONE >> "!LOG!"

REM ================================================================
REM  STEP 5b  PyInstaller backend
REM ================================================================
echo.
echo [5b/6] Building Python backend with PyInstaller (3-8 min)...
echo PyInstaller START >> "!LOG!"

call pyinstaller --clean --noconfirm "!BACKEND_DIR!\intellilaw_production.spec" >> "!LOG!" 2>&1
set PYI_ERR=!errorlevel!

if !PYI_ERR! NEQ 0 ( echo   [ERROR] PyInstaller failed & goto :show_tail_and_fail )

set BACKEND_EXE=
if exist "!DIST_DIR!\IntelliLaw\IntelliLaw-backend.exe" set BACKEND_EXE=!DIST_DIR!\IntelliLaw\IntelliLaw-backend.exe
if exist "!DIST_DIR!\IntelliLaw-backend.exe"            set BACKEND_EXE=!DIST_DIR!\IntelliLaw-backend.exe
if not defined BACKEND_EXE (
    echo   [ERROR] IntelliLaw-backend.exe not found after PyInstaller
    goto :show_tail_and_fail
)

mkdir "!BACKEND_DIST!" >nul 2>&1
if exist "!DIST_DIR!\IntelliLaw\" (
    xcopy /s /q "!DIST_DIR!\IntelliLaw\*" "!BACKEND_DIST!\" >> "!LOG!" 2>&1
) else (
    copy "!BACKEND_EXE!" "!BACKEND_DIST!\IntelliLaw-backend.exe" >nul
)
echo   [OK] Backend built  in  backend-dist\IntelliLaw-backend.exe
echo PyInstaller DONE >> "!LOG!"

REM ================================================================
REM  STEP 6  Electron NSIS installer
REM ================================================================
echo.
echo [6/6] Building Electron installer (NSIS 2-5 min)...
pushd "!FRONTEND_DIR!"
call npx electron-builder --win --x64 --publish never >> "!LOG!" 2>&1
set EB_ERR=!errorlevel!
popd

if !EB_ERR! NEQ 0 ( echo   [ERROR] electron-builder failed & goto :show_tail_and_fail )

set INSTALLER=
for /f %%f in ('dir /b /o-d "!FRONTEND_DIR!\release\*.exe" 2^>nul') do (
    if not defined INSTALLER set INSTALLER=!FRONTEND_DIR!\release\%%f
)
if not defined INSTALLER ( echo   [ERROR] No installer .exe in frontend\release\ & goto :show_tail_and_fail )

REM ── Restore dev files ────────────────────────────────────────────
call "!BACKEND_DIR!\venv\Scripts\deactivate.bat" 2>nul
copy "!ENV_BACKUP!"   "!ENV_FILE!"  >nul & del "!ENV_BACKUP!"
copy "!MAIN_CJS_BAK!" "!MAIN_CJS!" >nul & del "!MAIN_CJS_BAK!"
echo Dev files restored >> "!LOG!"

for %%f in ("!INSTALLER!") do set INS_BYTES=%%~zf
set /a INS_MB=!INS_BYTES! / 1048576
echo BUILD COMPLETE  !INSTALLER!  (!INS_MB! MB) >> "!LOG!"

echo.
echo ================================================================
echo   BUILD SUCCESSFUL
echo ================================================================
echo.
echo   Installer : !INSTALLER!
echo   Size      : ~!INS_MB! MB
echo   Log       : !LOG!
echo.
echo   BEFORE DISTRIBUTING
echo   1. Edit backend\.env  ^>  change DEFAULT_ADMIN_PASSWORD
echo   2. Set FIRM_ID to a unique code for each client firm
echo   3. Store the DB_ENCRYPTION_KEY from .env in a safe place
echo   4. Copy the .gguf AI model to the target PC:
echo      %%USERPROFILE%%\IntelliLaw\firms\^<FIRM_ID^>\models\
echo.
echo   Default login:  admin  /  Admin123!
echo.
pause
endlocal
exit /b 0

REM ================================================================
REM  FAIL  — show last 30 log lines, restore dev files
REM ================================================================
:show_tail_and_fail
echo.
echo ── Last 30 lines of build_output.log ──────────────────────────
powershell -NoProfile -Command "Get-Content '!LOG!' -Tail 30 | Write-Host"
echo ────────────────────────────────────────────────────────────────
echo.
:restore_and_fail
if exist "!ENV_BACKUP!"   ( copy "!ENV_BACKUP!"   "!ENV_FILE!"  >nul & del "!ENV_BACKUP!"   )
if exist "!MAIN_CJS_BAK!" ( copy "!MAIN_CJS_BAK!" "!MAIN_CJS!" >nul & del "!MAIN_CJS_BAK!" )
call "!BACKEND_DIR!\venv\Scripts\deactivate.bat" 2>nul
echo BUILD FAILED >> "!LOG!"
echo   Full log: !LOG!
echo.
pause
endlocal
exit /b 1
