@echo off
chcp 65001 >nul
REM ========================================
REM LinuxDo Scraper - Background Run (No Window)
REM ========================================

REM Switch to script directory (ensure correct path)
cd /d "%~dp0"
if errorlevel 1 (
    echo Error: Cannot switch to script directory
    exit /b 1
)

REM Set path variables (based on script directory full path)
REM Note: %~dp0 already includes trailing backslash, concatenate directly
set "SCRIPT_DIR=%~dp0"
set "SCRAPER_DIR=%SCRIPT_DIR%linuxdo-scraper"
set "VENV_PYTHON=%SCRAPER_DIR%\venv\Scripts\pythonw.exe"
set "SCRAPER_SCRIPT=%SCRAPER_DIR%\linuxdo\scripts\scraper_optimized.py"
set "LOG_DIR=%SCRAPER_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\scraper.log"

REM Check if key files exist
if not exist "%VENV_PYTHON%" (
    echo Error: Python interpreter not found: %VENV_PYTHON%
    exit /b 1
)

if not exist "%SCRAPER_SCRIPT%" (
    echo Error: Scraper script not found: %SCRAPER_SCRIPT%
    exit /b 1
)

REM Ensure log directory exists (using full path)
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if errorlevel 1 (
    echo Error: Cannot create log directory: %LOG_DIR%
    exit /b 1
)

REM Switch to scraper directory (Python script may need relative paths)
cd /d "%SCRAPER_DIR%"
if errorlevel 1 (
    echo Error: Cannot switch to directory: %SCRAPER_DIR%
    exit /b 1
)

REM Run with pythonw.exe (no window), append logs to file
REM Use full path variables to ensure correct execution in scheduled tasks
"%VENV_PYTHON%" "%SCRAPER_SCRIPT%" >> "%LOG_FILE%" 2>&1

REM Note: pythonw.exe runs without window, cannot directly check ERRORLEVEL
REM To check execution result, please check log file: %LOG_FILE%