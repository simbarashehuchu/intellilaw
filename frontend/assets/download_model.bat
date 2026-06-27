@echo off
REM IntelliLaw — AI Model Download Helper
REM Downloads the default local LLM model for offline AI features.

setlocal

set MODEL_DIR=%USERPROFILE%\IntelliLaw\firms\default\models
set MODEL_FILE=qwen2.5-1.5b-instruct-q4_k_m.gguf
set MODEL_URL=https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/%MODEL_FILE%

echo.
echo IntelliLaw — Download Local AI Model
echo ======================================
echo Model : %MODEL_FILE%
echo Target: %MODEL_DIR%
echo.

if exist "%MODEL_DIR%\%MODEL_FILE%" (
    echo Model already exists. Nothing to do.
    pause & exit /b 0
)

mkdir "%MODEL_DIR%" 2>nul

echo Downloading... (approx 1 GB, may take several minutes)
echo.

where curl >nul 2>&1
if %errorlevel% EQU 0 (
    curl -L --progress-bar -o "%MODEL_DIR%\%MODEL_FILE%" "%MODEL_URL%"
) else (
    powershell -NoProfile -Command "Invoke-WebRequest -Uri '%MODEL_URL%' -OutFile '%MODEL_DIR%\%MODEL_FILE%' -UseBasicParsing"
)

if exist "%MODEL_DIR%\%MODEL_FILE%" (
    echo.
    echo Download complete: %MODEL_DIR%\%MODEL_FILE%
) else (
    echo.
    echo Download failed. Check your internet connection and try again.
)

pause
endlocal
