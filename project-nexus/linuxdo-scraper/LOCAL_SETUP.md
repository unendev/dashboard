# Linux.do 爬虫 - 本地PC运行指南

## 📋 功能说明

这是一个优化的 Linux.do 论坛爬虫，专为本地PC环境设计：

- ✅ 爬取 Linux.do 论坛RSS源的最新帖子
- ✅ 使用 DeepSeek AI 进行深度内容分析
- ✅ 生成包含技术细节、社区讨论要点的深度报告
- ✅ 数据存储到 Neon PostgreSQL 数据库
- ✅ 支持代理配置（突破反爬限制）
- ✅ 完善的错误处理和重试机制

## 🚀 快速开始

### 1. 安装依赖

```bash
# 进入爬虫目录
cd linuxdo-scraper

# 安装Python依赖
pip install playwright playwright-stealth asyncpg requests python-dotenv beautifulsoup4

# 安装浏览器（仅首次需要）
python -m playwright install chromium
```

### 2. 配置环境变量

在 `linuxdo-scraper` 目录下创建 `.env` 文件（可参考 `env.template`）：

```env
# DeepSeek API密钥（必填）
DEEPSEEK_API_KEY=your_deepseek_api_key

# 数据库连接URL（必填）
DATABASE_URL=postgresql://user:password@host/database

# 代理地址（可选，不需要代理则设为 none）
PROXY_URL=http://127.0.0.1:10809

# 爬取帖子数量（可选，默认30）
POST_COUNT_LIMIT=30

# 浏览器模式（可选，默认 true）
HEADLESS=true
```

**获取API密钥：**
- DeepSeek: https://platform.deepseek.com/api_keys
- Neon数据库: 从你的项目获取 `DATABASE_URL`

### 3. 运行爬虫

```bash
cd linuxdo/scripts
python scraper_optimized.py
```

## 📁 输出文件

爬虫运行后会生成以下文件：

```
linuxdo-scraper/
├── linuxdo/
│   ├── scripts/
│   │   ├── scraper_optimized.py    # 优化版爬虫
│   │   ├── scraper.log             # 运行日志
│   │   └── debug_rss_*.html        # RSS调试文件
│   └── data/
│       └── linux.do_report_*.json  # 每日报告（JSON格式）
```

## ⚙️ 配置说明

### 代理配置

如果 Linux.do 访问受限，需要配置代理：

```env
# Windows 本地代理（Clash/V2rayN）
PROXY_URL=http://127.0.0.1:10809

# 不使用代理
PROXY_URL=none
```

### AI分析配置

在 `scraper_optimized.py` 中可调整：

```python
# AI请求间隔（避免速率限制）
AI_REQUEST_DELAY = 3  # 秒

# AI分析深度
max_tokens = 2000      # 生成的最大token数
temperature = 0.5      # 创造性（0-1）
```

### 爬取配置

```python
POST_COUNT_LIMIT = 30       # 爬取帖子数量
MAX_RETRIES = 3             # 失败重试次数
RETRY_DELAY = 5             # 重试间隔（秒）
HEADLESS = True             # 是否无头模式
```

## 🔧 常见问题

### 1. 代理连接失败

**错误：** `ERR_PROXY_CONNECTION_FAILED`

**解决：**
- 检查代理软件是否运行
- 确认代理端口（通常是 `10809` 或 `7890`）
- 尝试设置 `PROXY_URL=none` 直连

### 2. API调用失败

**错误：** `DeepSeek API调用失败: 401`

**解决：**
- 检查 `DEEPSEEK_API_KEY` 是否正确
- 确认API额度是否充足
- 访问 https://platform.deepseek.com 查看状态

### 3. 数据库连接失败

**错误：** `could not connect to server`

**解决：**
- 检查 `DATABASE_URL` 格式是否正确
- 确认网络能访问 Neon 数据库
- 检查数据库是否处于暂停状态

### 4. RSS解析失败

**错误：** `未能解析到任何帖子`

**解决：**
- 查看 `debug_rss_*.html` 文件确认RSS内容
- 检查是否被反爬虫拦截
- 尝试使用代理
- 查看 `scraper.log` 日志详情

### 5. 浏览器未安装

**错误：** `Executable doesn't exist at ...`

**解决：**
```bash
python -m playwright install chromium
```

## 📊 输出格式

### JSON报告结构

```json
{
  "meta": {
    "report_date": "2025-10-12",
    "title": "Linux.do 每日热帖报告",
    "post_count": 30,
    "generation_time": "2025-10-12T10:30:00",
    "status": "success"
  },
  "posts": [
    {
      "id": "123456",
      "title": "帖子标题",
      "url": "https://linux.do/t/...",
      "analysis": {
        "core_issue": "核心议题",
        "key_info": ["关键信息1", "关键信息2"],
        "post_type": "技术问答",
        "value_assessment": "高",
        "detailed_analysis": "## 📋 背景介绍\n..."
      }
    }
  ]
}
```

### 数据库表结构

```sql
CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    core_issue TEXT,
    key_info JSONB,
    post_type TEXT,
    value_assessment TEXT,
    detailed_analysis TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 定时任务

### Windows 任务计划程序

1. 打开"任务计划程序"
2. 创建基本任务
3. 触发器：每天特定时间
4. 操作：启动程序
   - 程序：`python`
   - 参数：`D:\path\to\scraper_optimized.py`
   - 起始于：`D:\path\to\linuxdo\scripts`

### Linux Cron

```bash
# 编辑crontab
crontab -e

# 每天早上8点运行
0 8 * * * cd /path/to/linuxdo/scripts && python scraper_optimized.py >> /path/to/cron.log 2>&1
```

## 📝 日志查看

```bash
# 实时查看日志
tail -f scraper.log

# 查看最后50行
tail -n 50 scraper.log

# 搜索错误
grep "ERROR" scraper.log
```

## 🎯 优化建议

1. **速度优化**
   - 减少 `AI_REQUEST_DELAY`（但注意API限制）
   - 使用有头模式调试，无头模式运行
   - 减少 `POST_COUNT_LIMIT`

2. **稳定性优化**
   - 增加 `MAX_RETRIES`
   - 检查网络稳定性
   - 使用稳定的代理

3. **成本优化**
   - 减少 `POST_COUNT_LIMIT`
   - 降低 `max_tokens`
   - 只分析高价值帖子

## 💡 使用提示

1. **首次运行**：建议先设置 `POST_COUNT_LIMIT=5` 测试
2. **调试模式**：设置 `HEADLESS=false` 可以看到浏览器运行过程
3. **日志监控**：运行时可以 `tail -f scraper.log` 实时查看日志
4. **网络问题**：如果频繁失败，检查代理配置或网络连接

## 📧 技术支持

遇到问题？

1. 查看 `scraper.log` 日志
2. 检查 `debug_rss_*.html` 文件
3. 确认环境变量配置
4. 查看上方常见问题

## 📄 许可证

本项目仅供学习使用，请遵守 Linux.do 论坛的使用条款。





