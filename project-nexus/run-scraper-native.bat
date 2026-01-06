@echo off
REM ==================================================
REM Project Nexus - Native Scraper Runner
REM Uses system Python directly. No venv required.
REM ==================================================

cd /d "%~dp0"

REM Check if dependencies are installed in system python
python -c "import playwright" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Playwright not found in system Python!
    echo Please run: pip install -r linuxdo-scraper/requirements.txt
    pause
    exit /b 1
)

REM Run scraper using system python (pythonw for background)
REM Change to 'python' to see output window
echo Starting scraper with system Python...
start "" pythonw linuxdo-scraper\linuxdo\scripts\scraper_optimized.py

echo Done.
exit /b 0
