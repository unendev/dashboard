@echo off
chcp 65001 >nul
REM ========================================
REM LinuxDo Scraper - With Control (Can be interrupted with Ctrl+C)
REM ========================================

REM Switch to script directory (ensure correct path)
cd /d "%~dp0"
if errorlevel 1 (
    echo Error: Cannot switch to script directory
    exit /b 1
)

REM Set path variables (based on script directory full path)
set "SCRIPT_DIR=%~dp0"
set "SCRAPER_DIR=%SCRIPT_DIR%linuxdo-scraper"
set "VENV_PYTHON=%SCRAPER_DIR%\venv\Scripts\python.exe"
set "SCRAPER_SCRIPT=%SCRAPER_DIR%\linuxdo\scripts\scraper_optimized.py"
set "LOG_DIR=%SCRAPER_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\scraper.log"

REM Check if key files exist
if not exist "%VENV_PYTHON%" (
    echo Error: Python interpreter not found: %VENV_PYTHON%
    echo Note: This script requires python.exe ^(not pythonw.exe^) for Ctrl+C support
    exit /b 1
)

if not exist "%SCRAPER_SCRIPT%" (
    echo Error: Scraper script not found: %SCRAPER_SCRIPT%
    exit /b 1
)

REM Ensure log directory exists
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if errorlevel 1 (
    echo Error: Cannot create log directory: %LOG_DIR%
    exit /b 1
)

REM Switch to scraper directory
cd /d "%SCRAPER_DIR%"
if errorlevel 1 (
    echo Error: Cannot switch to directory: %SCRAPER_DIR%
    exit /b 1
)

REM Display startup information
echo ========================================
echo LinuxDo Scraper - Starting...
echo ========================================
echo Script: %SCRAPER_SCRIPT%
echo Log file: %LOG_FILE%
set "START_TIME=%date% %time%"
echo Start time: %START_TIME%
echo.
echo Note: You can press Ctrl+C to stop the scraper
echo ========================================
echo.

REM Run with python.exe (with window), can be interrupted with Ctrl+C
REM Use start /wait to keep the window open and allow Ctrl+C
start /wait "%VENV_PYTHON%" "%SCRAPER_SCRIPT%"

REM Check execution result
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Scraper completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Scraper was interrupted or failed (Error code: %ERRORLEVEL%)
    echo ========================================
)

echo.
echo Log file: %LOG_FILE%
pause

