@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ========================================
echo LinuxDo Scraper - DEBUG MODE
echo ========================================

REM Switch to script directory
cd /d "%~dp0"
echo Current Directory: %CD%

set "SCRAPER_DIR=%~dp0linuxdo-scraper"
set "VENV_PYTHON=%SCRAPER_DIR%\venv\Scripts\python.exe"
set "SCRAPER_SCRIPT=%SCRAPER_DIR%\linuxdo\scripts\scraper_optimized.py"

echo.
echo Checking paths...
echo Scraper Dir: %SCRAPER_DIR%
echo Python Path: %VENV_PYTHON%
echo Script Path: %SCRAPER_SCRIPT%

if not exist "%VENV_PYTHON%" (
    echo [ERROR] Python not found in venv!
    echo Please check if 'linuxdo-scraper\venv' exists and is valid.
    pause
    exit /b 1
)

if not exist "%SCRAPER_SCRIPT%" (
    echo [ERROR] Script not found!
    pause
    exit /b 1
)

echo.
echo Running scraper in FOREGROUND (Close window to stop)...
echo ========================================

"%VENV_PYTHON%" "%SCRAPER_SCRIPT%"

echo.
echo ========================================
echo Scraper finished with exit code: %ERRORLEVEL%
pause
