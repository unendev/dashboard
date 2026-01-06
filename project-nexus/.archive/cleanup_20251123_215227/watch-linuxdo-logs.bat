@echo off
chcp 65001 >nul
REM ========================================
REM Watch LinuxDo Scraper Logs in Real-Time
REM ========================================

cd /d "%~dp0"
set "SCRIPT_DIR=%~dp0"
set "LOG_FILE=%SCRIPT_DIR%linuxdo-scraper\logs\scraper.log"

REM Check if log file exists
if not exist "%LOG_FILE%" (
    echo Log file not found: %LOG_FILE%
    echo Waiting for log file to be created...
    timeout /t 5 /nobreak >nul
    if not exist "%LOG_FILE%" (
        echo Log file still not found. The scraper may not be running.
        pause
        exit /b 1
    )
)

echo ========================================
echo LinuxDo Scraper - Real-Time Log Monitor
echo ========================================
echo Log file: %LOG_FILE%
echo.
echo Press Ctrl+C to stop monitoring
echo ========================================
echo.

REM Use PowerShell to tail the log file (similar to tail -f)
REM Show last 50 lines and continue monitoring for new lines
powershell -NoProfile -Command "$logFile = '%LOG_FILE%'; if (Test-Path $logFile) { Get-Content $logFile -Wait -Tail 50 } else { Write-Host 'Log file not found: ' $logFile; Write-Host 'Waiting for log file...'; while (-not (Test-Path $logFile)) { Start-Sleep -Seconds 1 }; Get-Content $logFile -Wait -Tail 50 }"

