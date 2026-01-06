@echo off
chcp 65001 >nul
REM ========================================
REM Heybox Scraper Startup Script
REM Daily automatic scraping of latest Heybox posts
REM ========================================

cd /d "%~dp0"

echo ========================================
echo Heybox Scraper Starting
echo Time: %date% %time%
echo ========================================

REM Activate Python virtual environment
if exist venv\Scripts\python.exe (
    echo [1/3] Using virtual environment...
    set PYTHON_EXE=venv\Scripts\python.exe
) else (
    echo [1/3] Using system Python...
    set PYTHON_EXE=python
)

REM Switch to scraper directory
cd linuxdo-scraper\heybox_scraper

REM Run scraper (Playwright version, MCP tested)
echo [2/3] Running scraper script...
%PYTHON_EXE% heybox_playwright_scraper.py

REM Check execution result
if %ERRORLEVEL% EQU 0 (
    echo [3/3] Scraper executed successfully!
    echo.
    echo Log file: linuxdo-scraper\heybox_scraper\logs\heybox_scraper.log
    echo Data backup: linuxdo-scraper\heybox_scraper\data\
) else (
    echo [3/3] Scraper execution failed (Error code: %ERRORLEVEL%)
    echo Please check log: linuxdo-scraper\heybox_scraper\logs\heybox_scraper.log
)

echo ========================================
echo Completion time: %date% %time%
echo ========================================

REM Uncomment below to view log file
REM notepad logs\heybox_scraper.log

REM Keep window open (optional)
REM pause

