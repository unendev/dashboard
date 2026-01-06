# 🚀 快速启动指南

## 5分钟完成配置

### ✅ 第1步: 配置Secrets (2分钟)

1. 打开仓库 → `Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret`，添加：

```
Name: DEEPSEEK_API_KEY
Value: sk-[你的API Key]

Name: DATABASE_URL  
Value: postgresql://[你的数据库连接串]
```

**获取DEEPSEEK_API_KEY**:
- 访问: https://platform.deepseek.com/
- 注册后进入API Keys页面创建

**获取DATABASE_URL**:
- 访问: https://neon.tech/
- 创建免费数据库
- 复制Connection String

### ✅ 第2步: 数据库迁移 (1分钟)

```bash
# 在项目根目录执行
npx prisma migrate dev
# 或者直接执行SQL
psql $DATABASE_URL < prisma/migrations/20251004_add_reddit_fields/migration.sql
```

### ✅ 第3步: 手动测试 (2分钟)

1. 进入 `Actions` 标签
2. 选择 `Reddit多板块爬虫`
3. 点击 `Run workflow` → `Run workflow`
4. 等待2-3分钟
5. 查看执行结果

### ✅ 完成！

现在爬虫会每天北京时间19:00自动执行！

## 📊 查看数据

### 方式1: 前端API

```bash
# 获取最新10条
curl http://localhost:3000/api/reddit

# 筛选特定板块
curl http://localhost:3000/api/reddit?subreddit=technology

# 分页
curl http://localhost:3000/api/reddit?limit=5&offset=10
```

### 方式2: 数据库查询

```sql
-- 查看所有帖子
SELECT title_cn, subreddit, value_assessment 
FROM reddit_posts 
ORDER BY timestamp DESC 
LIMIT 10;

-- 统计各板块数量
SELECT subreddit, COUNT(*) as count
FROM reddit_posts
GROUP BY subreddit;
```

### 方式3: 下载报告

在Actions运行详情页底部下载`reddit-reports-xxx`压缩包

## 🎯 常用修改

### 修改爬取时间

`.github/workflows/reddit-scraper.yml`:
```yaml
cron: '0 11 * * *'  # 改成你想要的时间
```

### 修改爬取板块

`linuxdo-scraper/reddit_scraper/reddit_scraper_multi.py`:
```python
SUBREDDITS = [
    "technology",
    "gamedev",
    # 添加更多...
]
```

### 修改每板块帖子数

```python
POST_COUNT_PER_SUB = 5  # 改成你想要的数量
```

## ❓ 遇到问题？

1. 查看 [SETUP.md](../../.github/SETUP.md) 详细配置指南
2. 查看 [README.md](./README.md) 完整文档
3. 在Actions页面查看执行日志

---

**祝你使用愉快！** 🎉

如有问题欢迎提Issue~


