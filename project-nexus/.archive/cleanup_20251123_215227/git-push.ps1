Push-Location 'D:\Study\Vue-\dashboard\project-nexus'
try {
    Write-Host "开始编译项目..." -ForegroundColor Green
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "编译失败，请检查错误信息" -ForegroundColor Red
        exit 1
    }
    Write-Host "编译成功！" -ForegroundColor Green
    
    Write-Host "添加所有更改到 Git..." -ForegroundColor Green
    git add .
    
    Write-Host "提交更改..." -ForegroundColor Green
    git commit -m "更新项目代码：包含多个功能改进和bug修复"
    
    Write-Host "推送到远程仓库..." -ForegroundColor Green
    git push
    
    Write-Host "仓库推送成功！" -ForegroundColor Green
}
catch {
    Write-Host "发生错误: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
