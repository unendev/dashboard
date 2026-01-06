# 日志路径问题修复说明

## 问题描述

**现象**：爬虫脚本在 10.28 成功执行，但没有留下日志记录。

**根本原因**：
1. 脚本使用 **相对路径** `scraper.log` 记录日志
2. 当脚本通过不同的工作目录执行时，日志会被写到不同的位置
3. Windows 计划任务可能在 `C:\Windows\System32` 目录执行，导致日志写到了那里
4. `.bat` 脚本的重定向 `>> logs/scraper.log` 只捕获脚本的标准输出/错误，无法捕获脚本内部的日志

## 修复方案

### ✅ 已实施的修复

在 `linuxdo-scraper/linuxdo/scripts/scraper_optimized.py` 第 65-81 行进行了修改：

**修改前**：
```python
logging.FileHandler('scraper.log', encoding='utf-8'),  # ❌ 相对路径
```

**修改后**：
```python
# 确保日志目录存在，使用绝对路径避免工作目录变化
logs_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'logs')
os.makedirs(logs_dir, exist_ok=True)
log_file = os.path.join(logs_dir, 'scraper.log')

logging.FileHandler(log_file, encoding='utf-8'),  # ✅ 绝对路径
```

## 效果

✅ **使用绝对路径** `<脚本目录>/../logs/scraper.log`
- 无论从哪个工作目录执行脚本，日志都会写到 `linuxdo-scraper/logs/scraper.log`
- 解决了计划任务执行时日志丢失的问题
- 日志目录如果不存在会自动创建

## 为什么 10.28 没有日志？

**推测**：
1. Windows 计划任务在 10.28 00:00 时执行了脚本
2. 但是因为使用相对路径，日志被写到了其他位置（可能是 `C:\Windows\System32\scraper.log`）
3. 我们在 `linuxdo-scraper/logs/` 目录找不到对应的日志
4. 脚本本身成功执行（因为有新数据入库），但日志"丢失"了

**确认方法**：
```bash
# 检查系统临时目录
Get-ChildItem C:\Windows\System32\scraper*.log
Get-ChildItem $env:TEMP\scraper*.log
Get-ChildItem $env:USERPROFILE\scraper*.log
```

## 后续说明

从 **2025-10-29 后的执行** 开始，所有日志都会被正确记录在 `linuxdo-scraper/logs/scraper.log`。

### 验证修复：

执行诊断脚本检查数据更新情况：
```bash
node scripts/check-scheduler-logs.mjs
```

## 代码变更

| 文件 | 行号 | 变更 |
|------|------|------|
| `linuxdo-scraper/linuxdo/scripts/scraper_optimized.py` | 65-81 | 改为使用绝对路径 |

**关键改进**：
- ✅ 日志路径与脚本位置关联（相对于脚本目录的绝对路径）
- ✅ 自动创建 `logs` 目录
- ✅ 与 `.bat` 脚本的日志重定向兼容



