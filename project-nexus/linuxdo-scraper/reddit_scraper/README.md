# Reddit多板块爬虫

自动爬取Reddit技术和游戏开发相关板块的热门帖子，使用AI进行中文分析和翻译。

## 📋 功能特性

- ✅ **多板块支持**: technology, gamedev, godot, Unity3D, unrealengine
- ✅ **完整中文输出**: 标题翻译 + AI分析全中文
- ✅ **自动定时任务**: GitHub Actions每天自动执行
- ✅ **数据库存储**: 自动存入Neon PostgreSQL
- ✅ **双格式报告**: JSON + Markdown

## 🎯 爬取的Subreddit

| Subreddit | 说明 | 每日帖子数 |
|-----------|------|-----------|
| r/technology | 科技新闻与讨论 | 5 |
| r/gamedev | 独立游戏开发 | 5 |
| r/godot | Godot引擎 | 5 |
| r/Unity3D | Unity引擎 | 5 |
| r/unrealengine | 虚幻引擎 | 5 |

**总计**: 每天25个帖子

## 🚀 快速开始

### 1. GitHub Actions配置（推荐）

#### 添加Secrets

在你的GitHub仓库设置中添加以下Secrets：

1. 进入 `Settings` > `Secrets and variables` > `Actions`
2. 点击 `New repository secret`
3. 添加以下两个secret：

```
DEEPSEEK_API_KEY=sk-your-api-key-here
DATABASE_URL=postgresql://user:password@host/db
```

#### 执行方式

- **自动执行**: 每天北京时间19:00自动运行
- **手动触发**: 
  1. 进入仓库的 `Actions` 标签
  2. 选择 `Reddit多板块爬虫`
  3. 点击 `Run workflow`

### 2. 本地开发运行

```bash
# 1. 进入目录
cd linuxdo-scraper/reddit_scraper

# 2. 安装依赖
pip install requests python-dotenv asyncpg

# 3. 配置环境变量（创建 .env 文件）
cat > .env << EOF
DEEPSEEK_API_KEY=sk-your-api-key-here
DATABASE_URL=postgresql://user:password@host/db
PROXY_URL=http://127.0.0.1:10809  # 可选，本地代理
EOF

# 4. 运行爬虫
python reddit_scraper_multi.py
```

## 📊 输出格式

### JSON报告示例

```json
{
  "meta": {
    "report_date": "2025-10-04",
    "title": "Reddit技术+游戏开发每日报告 (2025-10-04)",
    "subreddits": ["technology", "gamedev", "godot", "Unity3D", "unrealengine"],
    "post_count": 25
  },
  "summary": {
    "overview": "今日Reddit社区技术讨论活跃...",
    "highlights": {
      "tech_news": ["苹果发布新产品...", "AI技术突破..."],
      "dev_insights": ["Unity优化技巧...", "Godot 4.0新特性..."],
      "hot_topics": ["游戏引擎大战...", "独立游戏市场..."]
    },
    "conclusion": "今天的内容干货满满！"
  },
  "posts": [
    {
      "id": "reddit_technology_1nx583c",
      "subreddit": "technology",
      "title": "Apple announces new MacBook Pro with M4 chip",
      "title_cn": "苹果发布搭载M4芯片的新款MacBook Pro",
      "url": "https://reddit.com/r/technology/...",
      "analysis": {
        "title_cn": "苹果发布搭载M4芯片的新款MacBook Pro",
        "core_issue": "苹果推出性能更强的M4芯片笔记本",
        "key_info": [
          "M4芯片性能提升40%",
          "售价从$1999起"
        ],
        "post_type": "新闻分享",
        "value_assessment": "高"
      }
    }
  ]
}
```

### 数据库表结构

```sql
CREATE TABLE reddit_posts (
    id TEXT PRIMARY KEY,              -- reddit_technology_1nx583c
    title TEXT NOT NULL,              -- 英文原标题
    title_cn TEXT,                    -- 中文翻译标题
    url TEXT NOT NULL,                -- Reddit帖子链接
    core_issue TEXT,                  -- 核心议题（中文）
    key_info JSONB,                   -- 关键信息数组（中文）
    post_type TEXT,                   -- 帖子类型（中文）
    value_assessment TEXT,            -- 价值评估：高/中/低
    subreddit TEXT,                   -- 所属板块
    score INTEGER,                    -- 热度分数
    num_comments INTEGER,             -- 评论数
    timestamp TIMESTAMPTZ             -- 入库时间
);
```

## 🔧 配置说明

### 修改爬取的Subreddit

编辑 `reddit_scraper_multi.py`：

```python
SUBREDDITS = [
    "technology",
    "gamedev",
    "godot",        # 可以改成其他板块
    "Unity3D",      # 比如 "unrealengine"
    "indiegame"     # 或者 "programming"
]
```

### 修改每板块帖子数

```python
POST_COUNT_PER_SUB = 5  # 改成你想要的数量
```

### 修改执行时间

编辑 `.github/workflows/reddit-scraper.yml`：

```yaml
schedule:
  - cron: '0 11 * * *'  # UTC 11:00 = 北京时间 19:00
  # 改成你想要的时间，格式: 分 时 日 月 周
```

## 📖 前端集成示例

### 创建API接口

```typescript
// app/api/reddit/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subreddit = searchParams.get('subreddit');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  try {
    const posts = await prisma.reddit_posts.findMany({
      where: subreddit ? { subreddit } : {},
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    
    return NextResponse.json({
      success: true,
      data: posts
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '获取数据失败'
    }, { status: 500 });
  }
}
```

### React组件示例

```tsx
// app/components/RedditFeed.tsx
'use client';

import { useEffect, useState } from 'react';

export default function RedditFeed() {
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    fetch('/api/reddit?limit=10')
      .then(res => res.json())
      .then(data => setPosts(data.data));
  }, []);
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Reddit技术热点</h2>
      {posts.map(post => (
        <div key={post.id} className="border p-4 rounded">
          <h3 className="font-bold">{post.title_cn}</h3>
          <p className="text-sm text-gray-500">r/{post.subreddit}</p>
          <p className="mt-2">{post.core_issue}</p>
          <a href={post.url} target="_blank" className="text-blue-500">
            查看原帖 →
          </a>
        </div>
      ))}
    </div>
  );
}
```

## ⚠️ 注意事项

1. **API速率限制**: DeepSeek API有速率限制，每个帖子间隔3秒
2. **执行时间**: 预计25个帖子需要约2-3分钟
3. **成本**: DeepSeek API费用约 ¥0.001/次分析
4. **Reddit限制**: RSS源有时会限流，建议不要过于频繁请求

## 📝 更新日志

### v2.0.0 (2025-10-04)
- ✨ 新增多板块支持
- ✨ 新增标题中文翻译
- ✨ 优化AI提示词确保完整中文输出
- ✨ 支持GitHub Actions自动执行
- 🐛 修复本地代理配置问题

### v1.0.0 (2025-09-27)
- 🎉 初始版本
- ✅ 支持单板块爬取
- ✅ 基础AI分析功能

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License


