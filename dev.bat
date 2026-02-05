@echo off
echo ==========================================
echo   Starting Project Nexus (Port 3001)
echo   Starting Timer Widget (Vite)
echo ==========================================

start "Project Nexus" cmd /c "pnpm -F project-nexus dev"
start "Timer Widget" cmd /c "pnpm -F timer-widget dev"

echo Processes started in separate windows.
pause
