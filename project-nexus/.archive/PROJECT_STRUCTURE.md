# Project Nexus - 项目目录结构梳理 🗂️

**个人一体化效率中枢 - 全栈生产力管理平台**

> 完整版本更新于 2025-10-23

---

## 📊 项目全景概览

| 维度 | 说明 |
|------|------|
| **项目名称** | Project Nexus |
| **项目定位** | 个人生产力管理一体化平台 |
| **技术栈** | Next.js 15 + React 19 + TypeScript + PostgreSQL + Prisma |
| **代码规模** | 15,000+ 行 TypeScript |
| **组件数量** | 100+ 个 React 组件 |
| **API端点** | 43 个 RESTful 接口 |
| **核心数据模型** | 20+ 个 Prisma 模型 |
| **部署方式** | Standalone (Next.js) |

---

## 🏗️ 项目结构总览

```
project-nexus/
├── 📂 app/                     # Next.js App Router (前端+后端)
├── 📂 lib/                     # 核心业务逻辑库
├── 📂 prisma/                  # 数据库 Schema 和迁移
├── 📂 linuxdo-scraper/        # Python 爬虫系统
├── 📂 scripts/                # 辅助脚本
├── 📂 types/                  # TypeScript 类型定义
├── 📂 public/                 # 静态资源
├── 📂 config/                 # 配置文件
├── 📄 package.json            # 项目依赖
├── 📄 next.config.ts          # Next.js 配置
├── 📄 tsconfig.json           # TypeScript 配置
├── 📄 middleware.ts           # 中间件
└── 📄 README.md               # 项目文档
```

---

## 🎯 核心功能模块

### 1. 智能日志系统 📝

**路径**: `app/components/features/log/` + `app/api/logs/` + `app/log/`

**核心功能**：
- ⏱️ 实时计时引擎：支持无限层级嵌套任务
- 📊 分类统计：按分类/标签统计任务时间
- 🤖 AI智能总结：DeepSeek 自动生成日报
- 📈 数据可视化：ECharts 多维度分析

**主要文件**：
- CreateLogForm.tsx - 日志创建表单
- LogDisplayTable.tsx - 日志展示表格
- LogCategorySelector.tsx - 分类选择器

---

### 2. 计时器系统 ⏰

**路径**: `app/components/features/timer/` + `app/api/timer-tasks/` + `app/timer/`

**核心功能**：
- 🔄 无限嵌套：Task → SubTask → SubSubTask...
- 🎯 拖拽排序：桌面/移动端支持（>95%成功率）
- 🏷️ 标签管理：InstanceTag 事务项标签
- ⏸️ 暂停/继续：毫秒级精度时间管理

**主要文件**：
- NestedTimerZone.tsx (1270行) - 核心递归组件
- TimerWidget.tsx - 计时器小部件
- EnhancedTimer.tsx - 增强计时器

---

### 3. 藏宝阁知识库 💎

**路径**: `app/components/features/treasure/` + `app/api/treasures/` + `app/treasure-pavilion/`

**核心功能**：
- 📄 文本卡片：Markdown 编辑，主题自定义
- 🖼️ 图片画廊：OSS存储，CDN加速，拖拽上传
- 🎵 音乐收藏：音乐信息管理+播放链接
- 🔖 标签管理：层级标签，全文搜索RAG

**主要文件**：
- TreasureTimeline.tsx - 时间线视图
- TextCard.tsx / ImageGalleryCard.tsx / MusicCard.tsx - 卡片组件

---

### 4. 进度追踪系统 📊

**路径**: `app/components/features/progress/` + `app/api/progress/` + `app/progress/`

**核心功能**：
- 📅 每日进度：AI初步分析 → 用户反馈 → 最终确认
- 🎓 技能档案：SkillProfile 累积追踪
- 🏗️ 项目档案：ProjectProfile 进度管理
- 📈 周里程碑：Milestone 每周回顾

**数据模型**: DailyProgress, SkillProfile, ProjectProfile, Milestone

---

### 5. 笔记系统 📖

**路径**: `app/components/features/notes/` + `app/api/notes/`

**核心功能**：
- 📝 纯 Markdown：简洁高效
- 💾 自动保存：实时同步
- 🔍 快速定位：层级组织

---

### 6. 阅读系统 📚

**路径**: `app/components/features/webread/` + `app/api/webread/` + `app/webread/`

**核心功能**：
- 📖 EPUB阅读：React EPUB Viewer 集成
- 📌 阅读进度：ReadingProgress 追踪
- 📝 书籍笔记：BookNote 标注管理
- 📤 文件上传：Vercel Blob 存储

---

### 7. 内容聚合系统 🌐

**集成来源**：
- 📺 Bilibili - bilibili-feeds API
- 🎬 YouTube - youtube API
- 👨‍💻 LinuxDo - linuxdo 爬虫
- 🤖 Reddit - reddit 爬虫
- 🎵 Spotify - spotify API
- 📰 阮一峰周刊 - ruanyifeng-feeds API
- 🐦 Twitter - twitter 缓存系统

---

## 🔌 API 端点 (43个)

### 认证与用户
- POST /api/auth/register - 用户注册
- POST /api/auth/ensure-demo-user - 创建演示用户

### 日志系统
- GET /api/logs - 获取日志列表
- POST /api/logs - 创建日志
- GET /api/log-categories - 获取分类

### 计时器任务
- GET /api/timer-tasks - 获取任务列表
- POST /api/timer-tasks - 创建任务
- PATCH /api/timer-tasks/[id] - 更新任务
- GET /api/timer-tasks/running - 获取运行中任务

### 进度系统
- GET /api/progress - 获取进度列表
- POST /api/progress/analyze - AI 分析
- POST /api/progress/confirm - 用户确认

### 藏宝阁
- GET /api/treasures - 获取宝藏列表
- POST /api/treasures - 创建宝藏
- POST /api/treasures/[id]/answers - 创建评论

### 笔记
- GET /api/notes - 获取笔记列表
- POST /api/notes - 创建笔记

### 阅读系统
- GET /api/webread/books - 获取书籍列表
- POST /api/webread/books - 上传书籍
- GET /api/webread/progress/[id] - 获取阅读进度

### 内容聚合
- GET /api/bilibili-feeds - Bilibili 动态
- GET /api/youtube/[type] - YouTube 内容
- GET /api/reddit/[type] - Reddit 内容
- GET /api/linuxdo/[type] - LinuxDo 内容

---

## 📦 核心库 (lib/)

| 文件 | 功能说明 |
|------|---------|
| **prisma.ts** | Prisma 客户端单例 |
| **auth.ts** | NextAuth.js 配置 |
| **ai-service.ts** | DeepSeek API 集成 |
| **oss-utils.ts** | 阿里云OSS工具 |
| **rag-service.ts** | RAG 向量搜索 |
| **timer-db.ts** | 计时器数据库操作 |
| **category-cache.ts** | 分类缓存 |
| **instance-tag-cache.ts** | 标签缓存 |

---

## 🗄️ 数据模型

### 用户相关
- User, Account, Session, VerificationToken

### 日志与任务
- Log, LogCategory, Quest, Skill

### 计时器
- TimerTask (支持无限嵌套), InstanceTag

### 进度追踪
- DailyProgress, SkillProfile, ProjectProfile, Milestone

### 藏宝阁
- Treasure, TreasureLike, TreasureAnswer, Image

### 其他
- Article, MindMap, TwitterUser, YouTubeVideoCache, Book

---

## 🐍 Python 爬虫系统

**路径**: `linuxdo-scraper/`

### LinuxDo 爬虫
- 脚本: `linuxdo/scripts/scraper.py`
- 功能: 抓取论坛帖子、评论、用户数据
- 输出: JSON 报告

### Reddit 爬虫
- 脚本: `reddit_scraper/reddit_scraper_multi.py`
- 功能: 爬取 Subreddit 内容和评论
- 输出: JSON 报告

---

## 📄 主要页面

| 路径 | 功能说明 |
|------|---------|
| **/** | 首页/重定向 |
| **/dashboard** | 仪表盘 |
| **/log** | 日志系统 |
| **/timer** | 计时器 |
| **/treasure-pavilion** | 藏宝阁主页 |
| **/progress** | 进度追踪 |
| **/webread** | 阅读系统 |
| **/auth/signin** | 登录页面 |
| **/auth/register** | 注册页面 |

---

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | Next.js | 15.x |
| **UI库** | React | 19.x |
| **语言** | TypeScript | 5.x |
| **样式** | Tailwind CSS | 4.x |
| **数据库** | PostgreSQL | Latest |
| **ORM** | Prisma | 6.x |
| **认证** | NextAuth.js | 4.x |
| **拖拽** | dnd-kit | 6.x |
| **图表** | ECharts | 5.x |
| **AI** | DeepSeek | API |
| **存储** | 阿里云OSS | v6.x |

---

## 🎯 项目亮点

### ✨ 架构创新
1. **递归组件系统** - 支持无限层级嵌套
2. **乐观更新机制** - 零延迟用户体验
3. **实时计时引擎** - 毫秒级精度
4. **高级拖拽系统** - 移动端>95%成功率

### 🚀 功能完整性
- 10+ 核心功能模块
- 43 个 API 端点
- 20+ 数据模型
- 100+ React 组件

---

**最后更新**: 2025-10-23  
**许可证**: MIT
