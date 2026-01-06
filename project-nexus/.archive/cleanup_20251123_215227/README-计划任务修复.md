# LinuxDo 爬虫计划任务修复指南

## 🔍 问题诊断

根据诊断结果，发现以下问题：

1. **最新日志日期**: 2025-10-30 17:05:25
2. **数据库最新数据**: 2025-10-30 17:05:25  
3. **当前日期**: 2025-11-10
4. **数据未更新天数**: 10 天

## ❌ 问题原因

计划任务存在但配置错误：
- **任务名称**: `\LinuxDo`
- **上次执行结果**: `-2147024629` (执行失败)
- **问题**: 计划任务的"要运行的命令"配置错误，路径拼接有问题

## ✅ 解决方案

### 方法1: 使用修复脚本（推荐）

1. **右键以管理员身份运行** `修复LinuxDo计划任务.bat`
2. 脚本会自动：
   - 删除旧的错误配置
   - 创建新的正确配置
   - 设置为每天 19:04 执行

### 方法2: 手动修复

1. 打开"任务计划程序" (`Win + R` → 输入 `taskschd.msc`)
2. 找到任务 `LinuxDo`
3. 右键 → 删除（如果存在）
4. 创建新任务：
   - **常规**:
     - 名称: `LinuxDo`
     - 描述: `LinuxDo 爬虫每日自动运行`
     - 勾选"不管用户是否登录都要运行"
     - 勾选"使用最高权限运行"
   - **触发器**:
     - 新建 → 每天 → 19:04
   - **操作**:
     - 新建 → 启动程序
     - 程序或脚本: `D:\Study\Vue-\dashboard\project-nexus\run-linuxdo-optimized-en.bat`
     - 起始于: `D:\Study\Vue-\dashboard\project-nexus`
   - **条件**:
     - 取消勾选"只有在计算机使用交流电源时才启动此任务"（如果使用笔记本）
   - **设置**:
     - 勾选"允许按需运行任务"
     - 勾选"如果请求时任务正在运行，则停止现有实例"

### 方法3: 使用命令行（需要管理员权限）

```cmd
REM 删除旧任务
schtasks /delete /tn "\LinuxDo" /f

REM 创建新任务（每天19:04执行）
schtasks /create /tn "\LinuxDo" /tr "D:\Study\Vue-\dashboard\project-nexus\run-linuxdo-optimized-en.bat" /sc daily /st 19:04 /ru "%USERNAME%" /f
```

## 🧪 测试计划任务

### 立即测试执行

```cmd
REM 手动触发任务执行
schtasks /run /tn "\LinuxDo"
```

### 查看执行结果

```cmd
REM 查看任务状态
schtasks /query /tn "\LinuxDo" /fo list /v

REM 查看日志
notepad D:\Study\Vue-\dashboard\project-nexus\linuxdo-scraper\logs\scraper.log
```

### 运行诊断工具

```cmd
node scripts/check-scheduler-logs.mjs
```

## 📋 验证修复

修复后，检查以下内容：

1. ✅ 计划任务状态为"就绪"
2. ✅ 下次运行时间显示为明天的 19:04
3. ✅ 手动运行任务后，日志文件有新的记录
4. ✅ 数据库中有新的数据（timestamp 为今天）

## 🔧 常见问题

### Q: 计划任务执行失败怎么办？

**检查清单**:
1. 确认 bat 文件路径正确
2. 确认虚拟环境存在: `D:\Study\Vue-\dashboard\project-nexus\venv`
3. 确认 Python 脚本存在: `linuxdo-scraper\linuxdo\scripts\scraper_optimized.py`
4. 检查 `.env` 文件配置是否正确
5. 查看日志文件: `linuxdo-scraper\logs\scraper.log`

### Q: 如何修改执行时间？

```cmd
REM 修改为每天 20:00 执行
schtasks /change /tn "\LinuxDo" /st 20:00
```

### Q: 如何查看任务历史记录？

1. 打开"任务计划程序"
2. 找到 `LinuxDo` 任务
3. 点击"历史记录"选项卡

## 📝 相关文件

- **爬虫脚本**: `run-linuxdo-optimized-en.bat`
- **日志文件**: `linuxdo-scraper\logs\scraper.log`
- **诊断工具**: `scripts/check-scheduler-logs.mjs`
- **查看日志**: `查看LinuxDo日志.bat`














