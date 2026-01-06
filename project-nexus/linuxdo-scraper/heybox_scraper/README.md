# 小黑盒爬虫使用文档

## 📋 功能说明

这是一个轻量级的小黑盒游戏社区爬虫，用于：

- ✅ 每日自动爬取小黑盒首页最新20个帖子
- ✅ 抓取每个帖子的评论区内容
- ✅ 使用DeepSeek AI进行智能分析
- ✅ 数据存储到PostgreSQL数据库
- ✅ 前端实时展示（集成到首页）

**技术特点**：
- 基于 `requests` 库的轻量级实现（无需浏览器）
- 使用 `x-xhh-tokenid` 进行认证
- 支持本地运行和 GitHub Actions 云端运行

---

## 🚀 快速开始

### 步骤1：获取小黑盒 Token

1. 浏览器访问 https://www.xiaoheihe.cn 并登录你的账号
2. 按 `F12` 打开开发者工具
3. 切换到 `Network` (网络) 标签
4. 刷新页面，点击任意请求
5. 在 `Request Headers` 中找到 `x-xhh-tokenid`
6. 复制完整的 token 值

**示例**：
```
x-xhh-tokenid: BmG6lgAmG/emKgY6F+XyquvLgj0l21Tf6MDDBZSCR0v9o8u5H5M463Gz+ERKSJN1rb1nQpDeQWKmMcV2jIdcNIg==
```

![获取Token示例](https://via.placeholder.com/600x300?text=F12+%E2%86%92+Network+%E2%86%92+Request+Headers+%E2%86%92+x-xhh-tokenid)

---

### 步骤2：配置环境变量

在项目根目录的 `.env` 文件中添加：

```env
# 小黑盒Token（必填）
HEYBOX_TOKEN_ID=你的token值

# 爬取配置（可选）
HEYBOX_POST_LIMIT=20
HEYBOX_COMMENT_LIMIT=50

# DeepSeek AI（必填）
DEEPSEEK_API_KEY=sk-your-api-key

# 数据库（必填）
DATABASE_URL=postgresql://user:password@host/database
```

---

### 步骤3：安装依赖

```bash
cd linuxdo-scraper
pip install requests asyncpg python-dotenv
```

**依赖说明**：
- `requests`: HTTP 请求库
- `asyncpg`: PostgreSQL 异步驱动
- `python-dotenv`: 环境变量管理

---

### 步骤4：执行数据库迁移

```bash
# 在项目根目录执行
npx prisma migrate dev --name add_heybox_tables
npx prisma generate
```

这将创建以下数据库表：
- `heybox_posts`: 帖子数据
- `heybox_comments`: 评论数据

---

### 步骤5：运行爬虫

#### 方式A：手动运行（测试）

```bash
cd linuxdo-scraper/heybox_scraper
python heybox_api_scraper.py
```

#### 方式B：使用批处理脚本（Windows）

双击运行项目根目录的 `run-heybox-scraper.bat`

#### 方式C：配置定时任务（Windows）

1. 打开"任务计划程序" (`Win+R` → `taskschd.msc`)
2. 创建基本任务
3. 命名：`小黑盒每日爬虫`
4. 触发器：每天凌晨00:00
5. 操作：启动程序
   - 程序：`D:\Study\Vue-\个人门户\project-nexus\run-heybox-scraper.bat`
   - 起始于：`D:\Study\Vue-\个人门户\project-nexus`
6. 保存

#### 方式D：使用 GitHub Actions（云端）

1. 在 GitHub 仓库设置中添加 Secrets：
   - `HEYBOX_TOKEN_ID`: 你的小黑盒token
   - `DEEPSEEK_API_KEY`: DeepSeek API密钥
   - `DATABASE_URL`: 数据库连接URL

2. GitHub Actions 会每天凌晨自动运行

3. 手动触发：
   - 进入 GitHub 仓库 → Actions 标签
   - 选择 "小黑盒爬虫定时任务"
   - 点击 "Run workflow"

---

## 📊 输出说明

### 数据库表结构

#### `heybox_posts` 表
```sql
CREATE TABLE heybox_posts (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  url               TEXT NOT NULL,
  author            TEXT,
  cover_image       TEXT,
  game_tag          TEXT,
  likes_count       INTEGER DEFAULT 0,
  comments_count    INTEGER DEFAULT 0,
  views_count       INTEGER DEFAULT 0,
  core_issue        TEXT,
  key_info          JSONB,
  post_type         TEXT,
  value_assessment  TEXT,
  detailed_analysis TEXT,
  timestamp         TIMESTAMPTZ DEFAULT NOW()
);
```

#### `heybox_comments` 表
```sql
CREATE TABLE heybox_comments (
  id          TEXT PRIMARY KEY,
  post_id     TEXT REFERENCES heybox_posts(id),
  author      TEXT,
  content     TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL,
  parent_id   TEXT,
  depth       INTEGER DEFAULT 0
);
```

### JSON备份文件

爬虫运行后会在 `data/` 目录生成 JSON 备份：

```
linuxdo-scraper/heybox_scraper/data/
└── heybox_report_2025-10-25.json
```

**格式示例**：
```json
{
  "meta": {
    "report_date": "2025-10-25",
    "title": "小黑盒每日报告 (2025-10-25)",
    "post_count": 20
  },
  "posts": [
    {
      "id": "12345",
      "title": "《黑神话：悟空》新DLC内容曝光",
      "url": "https://www.xiaoheihe.cn/link/12345",
      "author": "玩家A",
      "game_tag": "黑神话悟空",
      "likes_count": 1234,
      "comments_count": 567,
      "analysis": {
        "core_issue": "讨论黑神话DLC新内容",
        "key_info": ["新地图", "新BOSS", "新武器"],
        "post_type": "游戏资讯",
        "value_assessment": "高",
        "detailed_analysis": "## 📋 内容概述\n..."
      },
      "comments": [...]
    }
  ]
}
```

---

## 🎨 前端集成

### API 接口

#### 获取帖子列表
```typescript
GET /api/heybox?date=2025-10-25

Response:
{
  "meta": {
    "report_date": "2025-10-25",
    "title": "小黑盒每日报告 (2025-10-25)",
    "post_count": 20
  },
  "posts": [...]
}
```

#### 获取可用日期
```typescript
GET /api/heybox/dates

Response:
{
  "dates": [
    { "date": "2025-10-25", "count": 20, "label": "2025-10-25" },
    { "date": "2025-10-24", "count": 20, "label": "2025-10-24" }
  ]
}
```

### 首页展示

数据会自动集成到首页的卡片网格中，包括：

- 🎮 小黑盒切换按钮
- 📅 日期选择器
- 📋 大纲导航（左侧）
- 🃏 帖子卡片（紫色标识）
- 💬 详情弹窗（AI分析）

---

## ⚙️ 配置说明

### 爬虫配置

在 `config.py` 中可调整：

```python
# 爬取配置
POST_LIMIT = 20              # 帖子数量
COMMENT_LIMIT = 50           # 每个帖子的评论数量
REQUEST_INTERVAL = 2         # 请求间隔（秒）
MAX_RETRIES = 3              # 失败重试次数
RETRY_DELAY = 5              # 重试间隔（秒）

# AI配置
AI_REQUEST_DELAY = 3         # AI请求间隔（秒）
```

### 代理配置

如果需要使用代理：

```env
# .env
PROXY_URL=http://127.0.0.1:10809
```

不使用代理：
```env
PROXY_URL=none
```

---

## 🔧 常见问题

### 1. Token无效或过期

**错误**：API返回401未授权

**解决**：
1. 重新获取token（按步骤1操作）
2. 确认token完整复制（包括末尾的 `==`）
3. 检查是否在小黑盒登录状态

### 2. API接口调用失败

**错误**：爬虫提示"所有API端点尝试均失败"

**解决**：
1. 小黑盒API可能更新，需要手动抓包确认
2. 打开浏览器开发者工具（F12）
3. 访问小黑盒首页，查看Network请求
4. 找到获取帖子列表的API
5. 更新 `heybox_api_scraper.py` 中的 `fetch_home_feed()` 函数

**抓包参考**：
```python
# 可能的API端点（示例）
url = "https://api.xiaoheihe.cn/bbs/app/api/feed/home"
params = {
    "limit": 20,
    "offset": 0,
    "time": int(time.time() * 1000)
}
headers = {
    "x-xhh-tokenid": "你的token",
    "User-Agent": "...",
    ...
}
```

### 3. 数据库连接失败

**错误**：`could not connect to server`

**解决**：
- 检查 `DATABASE_URL` 配置
- 确认网络可访问数据库
- 检查数据库是否处于暂停状态（Neon会自动暂停）

### 4. AI分析失败

**错误**：DeepSeek API调用失败

**解决**：
- 检查 `DEEPSEEK_API_KEY` 是否正确
- 确认API额度充足
- 检查网络连接

---

## 📝 日志查看

### 运行日志

```bash
# 实时查看
tail -f linuxdo-scraper/heybox_scraper/logs/heybox_scraper.log

# 查看最后50行
tail -n 50 logs/heybox_scraper.log

# 搜索错误
grep "ERROR" logs/heybox_scraper.log
```

### 日志级别

- `INFO`: 正常运行信息
- `WARNING`: 警告信息（非致命错误）
- `ERROR`: 严重错误

---

## 🎯 最佳实践

### 1. Token管理

- ⏰ Token可能有有效期，建议每月更新一次
- 🔒 不要将Token提交到公开仓库
- 📝 记录Token获取日期，便于管理

### 2. 请求频率

- 😊 尊重网站服务器，不要设置过短的请求间隔
- ⏱️ 建议 `REQUEST_INTERVAL >= 2` 秒
- 📊 如果被限流，增加间隔时间

### 3. 数据管理

- 🗄️ 定期清理旧数据（30天以上）
- 💾 JSON备份可作为数据恢复来源
- 📊 监控数据库存储空间

### 4. 错误处理

- 🔍 定期查看日志文件
- 🚨 设置失败通知（可选）
- 🔧 遇到问题先查看本文档常见问题

---

## 📄 许可证

本项目仅供学习使用，请遵守小黑盒的使用条款和robots.txt规则。

---

## 🆘 技术支持

遇到问题？

1. 查看本文档的"常见问题"部分
2. 检查 `logs/heybox_scraper.log` 日志
3. 阅读 `UI_INTEGRATION_TODO.md`（前端集成）
4. 查看执行计划 `.claude/plan/小黑盒爬虫集成.md`

---

**最后更新**：2025-10-25
**版本**：1.0.0



