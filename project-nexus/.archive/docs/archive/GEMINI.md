# Project Nexus: Gemini 上下文 (中文版)

本文档旨在全面介绍 Project Nexus 应用、其架构和开发约定，为 AI 辅助开发提供基础上下文。

## 1. 项目概览

Project Nexus 是一个多功能的个人数字中心，旨在集中化管理用户数字生活的方方面面。它充当个人仪表板，集成了任务管理、知识组织、活动日志和内容消费等功能。

### 核心功能:

*   **仪表板与小组件:** 一个可定制的仪表板（可能使用 `ScrollableLayout`），用于显示各种信息小组件。
*   **任务管理:** 包括一个 `Todo`（待办事项）系统和一个 `TimerTask`（计时任务）系统，用于跟踪在不同活动上花费的时间。
*   **知识管理:** 
    *   **WebRead:** 一个功能齐全的浏览器内 EPUB 阅读器，具有进度跟踪、注释和 AI 翻译功能。
    *   **文章与思维导图:** 用于撰写长文和创建思维导图的工具（使用 `reactflow`）。
    *   **藏宝阁 (Treasure Pavilion):** 一个用于保存和组织各种类型内容（文本、图片、音乐）的空间。
    *   **笔记:** 一个基于 Markdown 的简单笔记系统。
*   **个人分析与 AI:** 
    *   **日志系统:** 用于记录日常活动的详细系统。
    *   **AI 摘要:** 基于记录的活动自动生成每日和每周的摘要与洞察。
    *   **技能与项目跟踪:** 分析日志以跟踪在不同技能和项目上花费的时间，并维护 `SkillProfile`（技能档案）和 `ProjectProfile`（项目档案）。
*   **外部集成:** 
    *   **认证:** 通过 NextAuth.js 实现基于 Google 和凭据（邮箱/密码）的认证。
    *   **内容源:** 缓存并显示来自 Twitter、YouTube 和 Bilibili 的内容。
    *   **数据爬虫:** 包含独立的基于 Python 的爬虫，用于从 LinuxDo 和 Reddit 等外部论坛获取数据。

### 架构与技术

*   **框架:** [Next.js](https://nextjs.org/) 15，使用 App Router。
*   **语言:** [TypeScript](https://www.typescriptlang.org/) (在 `strict` 严格模式下配置)。
*   **数据库:** [PostgreSQL](https://www.postgresql.org/)，通过 [Prisma ORM](https://www.prisma.io/) 进行管理。数据库模式 (`prisma/schema.prisma`) 非常详尽，是整个应用的支柱。
*   **认证:** [NextAuth.js](httpss://next-auth.js.org/) (`v4`)。
*   **样式:** [Tailwind CSS](https://tailwindcss.com/)。
*   **UI:** 使用 React、[Radix UI](https://www.radix-ui.com/) 原语和 [Lucide](https://lucide.dev/) 图标构建。
*   **文件存储:** [Vercel Blob](https://vercel.com/storage/blob) 用于存储 WebRead 功能上传的 EPUB 文件。
*   **部署:** 配置表明该项目部署在 Vercel 上，并使用独立输出模式 (`output: 'standalone'`)。

## 2. 构建与运行

以下是在 `package.json` 中定义的、对开发至关重要的命令。

*   **运行开发服务器:** 
    ```bash
    npm run dev
    ```

*   **构建生产版本:** 
    ```bash
    npm run build
    ```
    *注意: 此命令也会运行 `prisma generate` 以确保 Prisma Client 与数据库模式保持同步。*

*   **启动生产服务器:** 
    ```bash
    npm run start
    ```

*   **代码检查 (Lint):** 
    ```bash
    npm run lint
    ```

### 数据库管理

数据库操作通过 Prisma 和自定义脚本进行管理。

*   **应用模式变更 (开发环境):** 
    ```bash
    npm run db:push
    ```

*   **运行迁移 (生产环境):** 
    ```bash
    npm run db:migrate
    ```

*   **打开数据库图形界面:** 
    ```bash
    npm run db:studio
    ```

*   **创建新的迁移文件:** 
    ```bash
    npm run db:migrate:create "migration_name"
    ```

### 运行爬虫

项目包含外部爬虫。例如，要运行 LinuxDo 爬虫:

```bash
# 在项目根目录运行
.\run-linuxdo-scraper.bat
```

## 3. 开发约定

*   **代码风格:** 项目使用 ESLint 及 Next.js 的默认配置。关键规则对未使用变量和使用 `any` 类型发出警告，鼓励编写清晰且类型安全的代码。
*   **认证:** 所有受保护的路由和 API 端点都应使用 `getServerSession(authOptions)` 来确保用户已通过认证。用户的会话和 ID 可通过此机制获得。
*   **数据库:** 所有数据库交互 **必须** 通过 Prisma 客户端 (`lib/prisma.ts`) 进行。模式变更应在 `prisma/schema.prisma` 中进行，然后创建新的迁移。
*   **API 路由:** 后端逻辑在 `app/api/` 目录下的 Next.js API 路由处理器中实现。中间件 (`middleware.ts`) 用于对认证端点进行速率限制。
*   **环境变量:** 项目依赖环境变量来配置数据库 URL 和认证密钥 (例如 `POSTGRES_PRISMA_URL`, `GOOGLE_CLIENT_ID`)。这些变量不应提交到版本控制中。
