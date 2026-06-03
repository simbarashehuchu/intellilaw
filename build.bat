@echo off
REM ============================================================
REM IntelliLaw — Production Build Script
REM Run from: intellilaw\backend\
REM ============================================================
setlocal enabledelayedexpansion

set APP_NAME=IntelliLaw
set APP_VERSION=1.0.0
set LAN_PORT=8000

set BACKEND_DIR=%~dp0
if "!BACKEND_DIR:~-1!"=="\" set BACKEND_DIR=!BACKEND_DIR:~0,-1!
set FRONTEND_DIR=!BACKEND_DIR!\..\frontend
set PYINSTALLER_DIST=!BACKEND_DIR!\dist
set BACKEND_DIST=!BACKEND_DIR!\backend-dist
set ENV_FILE=!BACKEND_DIR!\.env
set ENV_BACKUP=!BACKEND_DIR!\.env.dev.bak

echo.
echo ============================================================
echo   %APP_NAME% v%APP_VERSION% — Build
echo ============================================================
echo.

REM Pre-flight
python --version >nul 2>&1 || (echo [ERROR] Python not found & pause & exit /b 1)
node --version   >nul 2>&1 || (echo [ERROR] Node.js not found & pause & exit /b 1)

if not exist "!BACKEND_DIR!\launcher.py" (echo [ERROR] launcher.py missing & pause & exit /b 1)
if not exist "!BACKEND_DIR!\app\main.py"  (echo [ERROR] app\main.py missing  & pause & exit /b 1)
if not exist "!FRONTEND_DIR!\package.json" (echo [ERROR] frontend\package.json missing & pause & exit /b 1)

echo [OK] Pre-flight checks passed
echo.

REM Python venv
if not exist "!BACKEND_DIR!\venv" python -m venv "!BACKEND_DIR!\venv"
call "!BACKEND_DIR!\venv\Scripts\activate.bat"
pip install --upgrade pip --quiet
pip install -r "!BACKEND_DIR!\requirements.txt" --quiet
echo [OK] Python dependencies ready
echo.

REM Patch .env for LAN
copy "!ENV_FILE!" "!ENV_BACKUP!" >nul
powershell -NoProfile -Command "$c=Get-Content '!ENV_FILE!'; $c | %%{if($_-match'^HOST='){'HOST=0.0.0.0'}elseif($_-match'^PORT='){'PORT=%LAN_PORT%'}elseif($_-match'^CORS_ORIGINS='){'CORS_ORIGINS=*'}else{$_}} | Set-Content '!ENV_FILE!'"
echo [OK] .env patched for LAN
echo.

REM PyInstaller
if exist "!BACKEND_DIR!\build" rmdir /s /q "!BACKEND_DIR!\build"
if exist "!PYINSTALLER_DIST!"  rmdir /s /q "!PYINSTALLER_DIST!"

pyinstaller --clean --noconfirm "!BACKEND_DIR!\intellilaw_production.spec"
set BUILD_RESULT=!errorlevel!

copy "!ENV_BACKUP!" "!ENV_FILE!" >nul
del  "!ENV_BACKUP!"

if "!BUILD_RESULT!" NEQ "0" (echo [ERROR] PyInstaller failed & pause & exit /b 1)
if not exist "!PYINSTALLER_DIST!\IntelliLaw-backend.exe" (
    echo [ERROR] IntelliLaw-backend.exe not found & pause & exit /b 1
)

if exist "!BACKEND_DIST!" rmdir /s /q "!BACKEND_DIST!"
mkdir "!BACKEND_DIST!"
copy "!PYINSTALLER_DIST!\IntelliLaw-backend.exe" "!BACKEND_DIST!\IntelliLaw-backend.exe" >nul
echo [OK] Backend built
echo.

REM Frontend
pushd "!FRONTEND_DIR!"
call npm install --prefer-offline --no-audit --no-fund
call npm run build
set VITE_RESULT=!errorlevel!
popd
if "!VITE_RESULT!" NEQ "0" (echo [ERROR] Vite build failed & pause & exit /b 1)
echo [OK] Frontend built
echo.

REM Electron NSIS
pushd "!FRONTEND_DIR!"
call npx electron-builder --win --x64 --publish never
set EB_RESULT=!errorlevel!
popd
if "!EB_RESULT!" NEQ "0" (echo [ERROR] electron-builder failed & pause & exit /b 1)

echo.
echo ============================================================
echo   BUILD SUCCESSFUL
echo ============================================================
echo.
echo   Installer: !FRONTEND_DIR!\release\
echo   LAN port:  %LAN_PORT%
echo   Default login: admin / Admin123!
echo.
pause
endlocal
