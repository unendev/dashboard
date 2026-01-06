@echo off
REM ========================================
REM LinuxDo Process Cleanup Script
REM ========================================

echo ========================================
echo LinuxDo Process Cleanup
echo ========================================
echo.

REM Find and close LinuxDo related processes using PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0cleanup-linuxdo-processes.ps1"

pause









