@echo off
setlocal enabledelayedexpansion
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
set "LOCK_FILE=%SCRIPT_DIR%.linuxdo-scraper.lock"

REM Check if process is already running (prevent duplicate execution)
REM Exclude cleanup scripts and only check actual Python scraper processes
REM Filter: must be pythonw.exe AND contain scraper_optimized.py AND not contain cleanup
powershell -NoProfile -Command "$procs = Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*scraper_optimized.py*' -and $_.CommandLine -notlike '*cleanup*' -and $_.Name -eq 'pythonw.exe' }; if ($procs) { $pids = ($procs | ForEach-Object { $_.ProcessId }) -join ', '; Write-Host 'Found running scraper process(es): PID' $pids; exit 1 } else { exit 0 }" 2>nul
if %ERRORLEVEL% EQU 0 (
    REM Wait a moment for process list to refresh (in case processes were just closed)
    timeout /t 1 /nobreak >nul 2>&1
    REM Double-check after delay
    powershell -NoProfile -Command "$procs = Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*scraper_optimized.py*' -and $_.CommandLine -notlike '*cleanup*' -and $_.Name -eq 'pythonw.exe' }; if ($procs) { $pids = ($procs | ForEach-Object { $_.ProcessId }) -join ', '; Write-Host 'Found running scraper process(es): PID' $pids; exit 1 } else { exit 0 }" >nul 2>&1
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

REM Display startup information
echo ========================================
echo LinuxDo Scraper - Starting...
echo ========================================
echo Script: %SCRAPER_SCRIPT%
echo Log file: %LOG_FILE%
echo Start time: %DATE% %TIME%
echo ========================================
echo.

REM Run with pythonw.exe (no window), append logs to file
REM Use full path variables to ensure correct execution in scheduled tasks
REM NOTE: pythonw.exe runs in background, Ctrl+C cannot interrupt it
REM       Use run-linuxdo-with-control.bat if you need Ctrl+C support
REM NOTE: Using 'start' command creates independent process
REM       Closing cmd window will NOT stop the process
REM       Use cleanup-linuxdo-processes.bat to stop it
echo Starting Python process in background...
start "" "%VENV_PYTHON%" "%SCRAPER_SCRIPT%" >> "%LOG_FILE%" 2>&1

REM Wait a moment for process to start
timeout /t 2 /nobreak >nul

REM Check if process started successfully
powershell -NoProfile -Command "$procs = Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*scraper_optimized.py*' -and $_.CommandLine -notlike '*cleanup*' -and $_.Name -eq 'pythonw.exe' }; if ($procs -and $procs.Count -gt 0) { $pids = ($procs | ForEach-Object { $_.ProcessId }) -join ', '; Write-Host 'Process started successfully (PID:' $pids ')'; exit 0 } else { Write-Host 'Warning: Process may not have started'; exit 1 }" 2>nul
set PS_VERIFY_RESULT=!ERRORLEVEL!
if !PS_VERIFY_RESULT! EQU 0 (
    goto :process_verified
) else (
    goto :process_not_verified
)

:process_verified
    echo Process is running in background.
    echo.
    echo IMPORTANT: This process runs in background and cannot be stopped with Ctrl+C
    echo IMPORTANT: Closing this cmd window will NOT stop the process
    echo To stop the process, use: cleanup-linuxdo-processes.bat
    echo.
    echo To view logs in real-time, use: watch-linuxdo-logs.bat
    echo Or use: run-linuxdo-with-logs.bat (starts scraper + opens log monitor)
    echo Or use: run-linuxdo-with-control.bat (supports Ctrl+C, shows output directly)
    echo.
    echo To view static logs, check: !LOG_FILE!
    goto :after_verification

:process_not_verified
    echo Warning: Unable to verify process started. Check log file for details.
    echo Log file: !LOG_FILE!

:after_verification

REM Remove lock file
if exist "%LOCK_FILE%" del "%LOCK_FILE%" >nul 2>&1

REM Note: pythonw.exe runs without window, cannot directly check ERRORLEVEL
REM To check execution result, please check log file: %LOG_FILE%