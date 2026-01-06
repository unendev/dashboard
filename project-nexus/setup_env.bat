@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ========================================
echo Project Nexus - Environment Setup Tool
echo ========================================

cd /d "%~dp0"
set "SCRAPER_DIR=linuxdo-scraper"
set "VENV_DIR=%SCRAPER_DIR%\venv"

REM 1. Find Python
echo [1/5] Finding Python...
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_CMD=python"
    echo Found Python in PATH.
) else (
    echo Python not found in PATH. Trying standard paths...
    REM Add more paths if needed, but usually Store python registers 'python' alias
    echo [ERROR] Python not found! Please install Python 3.8+ and add to PATH.
    pause
    exit /b 1
)

REM 2. Clean old venv
echo [2/5] Cleaning old environment...
if exist "%VENV_DIR%" (
    rmdir /s /q "%VENV_DIR%"
    echo Old venv removed.
)

REM 3. Create venv
echo [3/5] Creating virtual environment...
"%PYTHON_CMD%" -m venv "%VENV_DIR%"
if errorlevel 1 (
    echo [ERROR] Failed to create venv.
    pause
    exit /b 1
)

REM 4. Install dependencies
echo [4/5] Installing dependencies...
"%VENV_DIR%\Scripts\pip" install -r "%SCRAPER_DIR%\requirements.txt"
if errorlevel 1 (
    echo [ERROR] Failed to install requirements.
    pause
    exit /b 1
)

REM 5. Install Playwright browsers
echo [5/5] Installing Playwright browsers...
"%VENV_DIR%\Scripts\python" -m playwright install chromium
if errorlevel 1 (
    echo [ERROR] Failed to install browsers.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Environment setup complete!
echo ========================================
echo.
echo Please update your Windows Task Scheduler:
echo.
echo Program:   %~dp0run-linuxdo-optimized-en.bat
echo Start in:  %~dp0
echo.
pause
