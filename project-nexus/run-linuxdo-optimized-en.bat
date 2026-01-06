@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
REM ========================================
REM LinuxDo Scraper - DEBUG MODE (Visible Window)
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
set "LOCK_FILE=%SCRIPT_DIR%.linuxdo-scraper.lock"

REM Check if process is already running (prevent duplicate execution)
REM Filter: must be python.exe AND contain scraper_optimized.py AND not contain cleanup
powershell -NoProfile -Command "$procs = Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*scraper_optimized.py*' -and $_.CommandLine -notlike '*cleanup*' -and $_.Name -eq 'python.exe' }; if ($procs) { $pids = ($procs | ForEach-Object { $_.ProcessId }) -join ', '; Write-Host 'Found running scraper process(es): PID' $pids; exit 1 } else { exit 0 }" 2>nul
if %ERRORLEVEL% EQU 0 (
    REM Wait a moment for process list to refresh
    timeout /t 1 /nobreak >nul 2>&1
    REM Double-check after delay
    powershell -NoProfile -Command "$procs = Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*scraper_optimized.py*' -and $_.CommandLine -notlike '*cleanup*' -and $_.Name -eq 'python.exe' }; if ($procs) { $pids = ($procs | ForEach-Object { $_.ProcessId }) -join ', '; Write-Host 'Found running scraper process(es): PID' $pids; exit 1 } else { exit 0 }" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        REM Create lock file
        echo %DATE% %TIME% > "%LOCK_FILE%"
    ) else (
        echo Error: Scraper process is still running. Please wait a moment or use cleanup script.
        exit /b 1
    )
) else (
    echo Error: Scraper process is already running. Please wait or use cleanup script.
    exit /b 1
)

REM Check if key files exist
if not exist "%VENV_PYTHON%" (
    echo Error: Python interpreter not found: %VENV_PYTHON%
    exit /b 1
)

if not exist "%SCRAPER_SCRIPT%" (
    echo Error: Scraper script not found: %SCRAPER_SCRIPT%
    exit /b 1
)

REM Ensure log directory exists
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Switch to scraper directory
cd /d "%SCRAPER_DIR%"

REM Display startup information
echo ========================================
echo LinuxDo Scraper - Starting (DEBUG MODE)...
echo ========================================
echo Script: %SCRAPER_SCRIPT%
echo Log file: %LOG_FILE%
echo Start time: %DATE% %TIME%
echo ========================================
echo.

REM Run with python.exe (window visible), output to console
echo Starting Python process in foreground...
"%VENV_PYTHON%" "%SCRAPER_SCRIPT%"

echo.
echo Process finished.
REM Remove lock file
if exist "%LOCK_FILE%" del "%LOCK_FILE%" >nul 2>&1

pause
