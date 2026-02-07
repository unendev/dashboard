@echo off
echo ==========================================
echo   Starting Project Nexus (Port 3001)
echo   Starting Timer Widget (Electron)
echo ==========================================

echo [1/2] Starting Project Nexus...
start "Project Nexus" cmd /c "pnpm -F project-nexus dev"

echo [2/2] Waiting for API server (port 3001) to be ready...
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo      Still waiting for port 3001...
    goto wait_loop
)
echo      Port 3001 is ready!

echo [3/3] Starting Timer Widget (Electron)...
start "Timer Widget" cmd /c "pnpm -F timer-widget start"

echo ==========================================
echo   All processes started successfully!
echo ==========================================
pause
