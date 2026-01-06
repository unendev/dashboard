@echo off
REM ========================================
REM 查看 LinuxDo 爬虫日志
REM ========================================

cd /d "%~dp0"

REM 检查日志文件是否存在
if exist "linuxdo-scraper\logs\scraper.log" (
    echo 正在打开日志文件...
    notepad linuxdo-scraper\logs\scraper.log
) else (
    echo 日志文件不存在！
    echo 路径: linuxdo-scraper\logs\scraper.log
    pause
)



