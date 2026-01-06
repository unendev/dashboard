@echo off
chcp 65001 >nul
REM ========================================
REM 修复 LinuxDo 爬虫计划任务
REM ========================================

echo ========================================
echo 修复 LinuxDo 爬虫计划任务
echo ========================================
echo.

REM 获取当前脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "BAT_FILE=%SCRIPT_DIR%run-linuxdo-optimized-en.bat"

echo [1/3] 检查文件路径...
if not exist "%BAT_FILE%" (
    echo ❌ 错误：找不到脚本文件: %BAT_FILE%
    pause
    exit /b 1
)
echo ✓ 脚本文件存在: %BAT_FILE%
echo.

echo [2/3] 删除旧的计划任务（如果存在）...
schtasks /query /tn "\LinuxDo" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo 找到旧任务，正在删除...
    schtasks /delete /tn "\LinuxDo" /f
    if %ERRORLEVEL% EQU 0 (
        echo ✓ 旧任务已删除
    ) else (
        echo ⚠️  删除失败，可能需要管理员权限
    )
) else (
    echo ✓ 没有找到旧任务
)
echo.

echo [3/3] 创建新的计划任务...
echo 任务名称: LinuxDo
echo 执行时间: 每天 19:04
echo 脚本路径: %BAT_FILE%
echo.

REM 创建计划任务（每天19:04执行）
schtasks /create /tn "\LinuxDo" /tr "\"%BAT_FILE%\"" /sc daily /st 19:04 /ru "%USERNAME%" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 计划任务创建成功！
    echo.
    echo 📋 任务信息:
    schtasks /query /tn "\LinuxDo" /fo list /v | findstr /i "任务名 状态 下次运行时间 上次结果"
    echo.
    echo 💡 提示:
    echo   1. 任务将在每天 19:04 自动执行
    echo   2. 可以通过"任务计划程序"查看和管理任务
    echo   3. 日志文件: %SCRIPT_DIR%linuxdo-scraper\logs\scraper.log
    echo.
) else (
    echo.
    echo ❌ 计划任务创建失败！
    echo.
    echo 💡 可能的原因:
    echo   1. 需要管理员权限（右键"以管理员身份运行"）
    echo   2. 任务名称已存在（已尝试删除，但可能失败）
    echo.
    echo 📝 手动创建方法:
    echo   1. 打开"任务计划程序" (taskschd.msc)
    echo   2. 创建基本任务
    echo   3. 名称: LinuxDo
    echo   4. 触发器: 每天 19:04
    echo   5. 操作: 启动程序
    echo   6. 程序: %BAT_FILE%
    echo   7. 起始于: %SCRIPT_DIR%
    echo.
)

pause














