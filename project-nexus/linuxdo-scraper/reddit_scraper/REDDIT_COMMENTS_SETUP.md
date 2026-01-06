# Reddit 评论采集器配置指南

本文档说明如何配置 Reddit 评论采集器及其 GitHub Actions 工作流。

## 功能概述

Reddit 评论采集器会：
1. 从数据库中获取还未采集评论的 Reddit 帖子
2. 使用 Reddit API (PRAW) 获取这些帖子的完整评论树
3. 将评论数据存储到 `reddit_comments` 表中
4. 通过 GitHub Actions 定期自动运行

## 前置条件

### 1. Reddit API 应用注册

1. 访问 [Reddit 应用管理页面](https://www.reddit.com/prefs/apps)
2. 点击 "Create App" 或 "Create Another App"
3. 填写应用信息：
   - **Name**: 给应用起个名字 (如: `PersonalDashboard-CommentScraper`)
   - **Type**: 选择 `script`
   - **Description**: 应用描述 (可选)
   - **About URL**: 留空或填写你的项目 GitHub URL
   - **Redirect URI**: 填写 `http://localhost:8080` (脚本类型应用必需)
4. 点击 "Create app"

### 2. 获取 API 凭证

创建应用后，你会看到：
- **Client ID**: 应用名称下方的字符串 (如: `abc123def456`)
- **Client Secret**: "secret" 字段的值 (如: `xyz789uvw456`)

### 3. 准备 User-Agent

创建一个唯一的 User-Agent 字符串，格式：
```
<平台>:<应用ID>:<版本号> (by /u/<你的Reddit用户名>)
```

例如：
```
PersonalDashboard:CommentScraper:1.0.0 (by /u/your_username)
```

## GitHub Secrets 配置

在你的 GitHub 仓库中配置以下 Secrets：

1. 进入仓库页面
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret` 添加以下密钥：

### 必需的 Secrets

| Secret 名称 | 描述 | 示例值 |
|------------|------|--------|
| `REDDIT_CLIENT_ID` | Reddit 应用的 Client ID | `abc123def456` |
| `REDDIT_CLIENT_SECRET` | Reddit 应用的 Client Secret | `xyz789uvw456` |
| `REDDIT_USER_AGENT` | 用户代理字符串 | `PersonalDashboard:CommentScraper:1.0.0 (by /u/username)` |
| `DATABASE_URL` | PostgreSQL 数据库连接 URL | `postgresql://user:pass@host:5432/db` |

### 可选的 Secrets

| Secret 名称 | 描述 | 说明 |
|------------|------|------|
| `REDDIT_REFRESH_TOKEN` | Reddit 刷新令牌 | 用于需要认证的操作，当前脚本为只读模式可不需要 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 如果需要 AI 分析功能 |

## 本地开发配置

### 1. 创建 `.env` 文件

在 `linuxdo-scraper` 目录下创建 `.env` 文件：

```bash
# Reddit API
REDDIT_CLIENT_ID=你的_CLIENT_ID
REDDIT_CLIENT_SECRET=你的_CLIENT_SECRET
REDDIT_USER_AGENT=你的_USER_AGENT_字符串

# 数据库
DATABASE_URL=你的数据库连接URL

# 可选
REDDIT_REFRESH_TOKEN=你的_REFRESH_TOKEN
DEEPSEEK_API_KEY=你的_DEEPSEEK_KEY
```

### 2. 安装依赖

```bash
cd linuxdo-scraper
pip install -r requirements.txt
```

### 3. 运行脚本

```bash
cd reddit_scraper
python reddit_comments_scraper.py
```

## 数据库表结构

脚本会自动创建 `reddit_comments` 表：

```sql
CREATE TABLE reddit_comments (
    comment_id VARCHAR PRIMARY KEY,        -- Reddit 评论 ID
    post_id VARCHAR NOT NULL,             -- 本地数据库帖子 ID
    reddit_post_id VARCHAR NOT NULL,      -- Reddit 帖子 ID
    author VARCHAR,                       -- 评论作者
    body TEXT,                           -- 评论内容
    score INTEGER DEFAULT 0,             -- 评论得分
    created_utc TIMESTAMP,               -- 创建时间
    parent_id VARCHAR,                   -- 父评论/帖子 ID
    depth INTEGER DEFAULT 0,             -- 评论嵌套深度
    is_submitter BOOLEAN DEFAULT FALSE,  -- 是否为帖子作者
    permalink TEXT,                      -- 评论链接
    scraped_at TIMESTAMP DEFAULT NOW()   -- 采集时间
);
```

## GitHub Actions 工作流

### 调度时间

- **自动运行**: 每天 UTC 02:00 和 14:00 (北京时间 10:00 和 22:00)
- **手动触发**: 在 Actions 页面可以手动运行

### 工作流程

1. 检出代码
2. 设置 Python 3.11 环境
3. 安装依赖 (`requirements.txt`)
4. 运行评论采集脚本
5. 如果失败，上传日志文件作为 Artifact

### 查看结果

- **成功运行**: Actions 页面会显示绿色勾号
- **失败运行**: 会显示红色 X，可以下载日志文件查看详情
- **日志**: 在 Actions 运行详情中可以查看实时日志

## 故障排除

### 常见错误

1. **认证失败**: 检查 `REDDIT_CLIENT_ID` 和 `REDDIT_CLIENT_SECRET` 是否正确
2. **数据库连接失败**: 检查 `DATABASE_URL` 格式和网络连接
3. **API 限流**: Reddit API 有速率限制，脚本已添加延迟处理

### 调试模式

本地运行时可以添加更多日志：

```python
# 在脚本开头添加
logging.getLogger().setLevel(logging.DEBUG)
```

### 检查数据库

```sql
-- 查看采集到的评论数量
SELECT COUNT(*) FROM reddit_comments;

-- 查看最近采集的评论
SELECT * FROM reddit_comments 
ORDER BY scraped_at DESC 
LIMIT 10;

-- 查看哪些帖子还没有评论
SELECT p.id, p.title 
FROM posts p 
WHERE p.id LIKE 'reddit_%' 
AND NOT EXISTS (
    SELECT 1 FROM reddit_comments rc 
    WHERE rc.post_id = p.id
);
```

## 注意事项

1. **API 限制**: Reddit API 有使用限制，建议不要过于频繁运行
2. **存储空间**: 评论数据可能很大，注意数据库存储空间
3. **隐私**: 遵守 Reddit 的使用条款和隐私政策
4. **更新频率**: 评论采集不需要过于频繁，建议每日 1-2 次即可


















