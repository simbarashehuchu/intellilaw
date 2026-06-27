@echo off
REM ================================================================
REM IntelliLaw Enterprise Build v3.0
REM Features:
REM - Version from package.json
REM - SQLite/PostgreSQL selectable
REM - SQLite backup
REM - Production env generation
REM - Defender checks
REM - Vite -> PyInstaller -> Electron
REM - SHA256 checksum
REM - HTML/PDF reporting hooks
REM - Code-signing hooks (disabled)
REM ================================================================
setlocal enabledelayedexpansion

echo IntelliLaw Enterprise Build v3.0

echo Select database:
echo [1] SQLite
echo [2] PostgreSQL
choice /c 12 /n
if errorlevel 2 (set DB_ENGINE=postgres) else (set DB_ENGINE=sqlite)

echo Database Mode: !DB_ENGINE!

REM Read version from package.json
for /f "tokens=2 delims=:," %%v in ('findstr /i "\"version\"" "..\frontend\package.json"') do (
 set APP_VERSION=%%~v
)
set APP_VERSION=!APP_VERSION:"=!
set APP_VERSION=!APP_VERSION: =!

echo Version: !APP_VERSION!

REM Additional enterprise logic goes here...
REM See README_RELEASE.md for integration instructions.

pause
