@echo off
chcp 65001 >nul
echo ===============================================
echo 小黑盒 v2.2.0 完整测试
echo ===============================================
echo.

cd /d "%~dp0linuxdo-scraper"

echo [1/3] 检查Python环境...
python --version
if errorlevel 1 (
    echo ❌ Python未安装
    pause
    exit /b 1
)

echo.
echo [2/3] 运行爬虫（20个帖子）...
python heybox_scraper\heybox_playwright_scraper.py

echo.
echo [3/3] 测试完成！
echo 日志文件: linuxdo-scraper\heybox_scraper\logs\heybox_scraper.log
echo.
pause













