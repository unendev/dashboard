# Project Nexus

基于 Next.js 15 构建的综合性个人效率与内容聚合平台，集成 AI 驱动的洞察分析、多源信息流聚合和高级任务管理功能。

## 🚀 核心功能

### 📊 计时系统
- 层级化任务追踪，支持分类和子分类
- AI 驱动的自然语言任务解析
- 灵活的实例标签组织系统
- 实时计时器，支持暂停/恢复
- 每日和每周进度分析

### 🎨 藏宝阁
- 多格式内容收藏（文本、图片、音乐）
- AI 智能标签推荐
- 全屏图片灯箱浏览与导航
- 主题化内容组织
- TipTap 富文本编辑器

### 📰 信息流聚合
- 多源内容聚合：
  - Bilibili 视频动态
  - Reddit 帖子与评论
  - LinuxDO 论坛讨论
  - 小黑盒游戏社区
- 统一的信息流界面与过滤
- 自定义标签和分类
- AI 驱动的内容分析

### 📈 进度追踪
- AI 洞察的每日进度分析
- 技能档案与成长追踪
- 项目时间线可视化
- 每周里程碑回顾
- 自动化每日总结

### 📚 其他功能
- **WebRead**：EPUB 阅读器，支持笔记和 AI 分析
- **俄语学习**：基于 FSRS 算法的闪卡系统
- **思维导图**：可视化知识组织
- **协作房间**：基于 Liveblocks 的实时协作
- **笔记**：Markdown 笔记系统

## 🛠️ 技术栈

### 核心技术
- **框架**：Next.js 15.4.8（App Router）
- **运行时**：React 19.1.0
- **语言**：TypeScript 5
- **样式**：Tailwind CSS 3.4

### 后端
- **数据库**：PostgreSQL（Neon Serverless）
- **ORM**：Prisma 6.16
- **认证**：NextAuth.js v4
- **文件存储**：Vercel Blob / 阿里云 OSS

### AI 集成
- **提供商**：OpenAI、DeepSeek、Google Vertex AI
- **SDK**：Vercel AI SDK
- **功能**：流式响应、结构化输出、多提供商支持

### 测试
- **框架**：Vitest
- **属性测试**：fast-check
- **端到端**：Playwright

### 开发工具
- **包管理器**：pnpm >= 10.0.0
- **Node 版本**：>= 18.0.0
- **Monorepo**：pnpm workspaces

## 📦 安装

### 前置要求
```bash
# 安装 Node.js >= 18
# 安装 pnpm
npm install -g pnpm
```

### 设置步骤
```bash
# 克隆仓库
git clone https://github.com/unendev/dashboard.git
cd dashboard/project-nexus

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的凭证

# 设置数据库
pnpm db:push

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3001

## 🔧 配置

### 环境变量

```bash
# 数据库（Neon）
POSTGRES_PRISMA_URL=postgresql://...?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://...
SHADOW_DATABASE_URL=postgresql://...

# NextAuth 认证
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=你的密钥

# AI 提供商（至少配置一个）
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=...
GOOGLE_VERTEX_PROJECT_ID=...
GOOGLE_VERTEX_LOCATION=...

# 文件存储
OSS_REGION=...
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
OSS_BUCKET=...

# 可选：外部 API
BILIBILI_SESSDATA=...
```

## 📖 文档

### 开发指南
`.kiro/steering/` 目录下的完整开发规范：
- [项目概览](project-nexus/.kiro/steering/project-overview.md) - 架构和功能
- [代码规范](project-nexus/.kiro/steering/code-standards.md) - 编码约定
- [组件模式](project-nexus/.kiro/steering/component-patterns.md) - React 最佳实践
- [数据库模式](project-nexus/.kiro/steering/database-patterns.md) - Prisma 指南
- [AI 集成](project-nexus/.kiro/steering/ai-integration.md) - AI 实现指南
- [外部 API](project-nexus/.kiro/steering/external-apis.md) - API 集成模式
- [身份认证](project-nexus/.kiro/steering/authentication.md) - 认证与授权
- [测试指南](project-nexus/.kiro/steering/testing-guide.md) - 测试策略
- [快速开始](project-nexus/.kiro/steering/GETTING_STARTED.md) - 新手指南

### 功能文档
- [Bilibili 集成](project-nexus/doc/BILIBILI_INTEGRATION_SUMMARY.md)
- [计时器标签识别](project-nexus/TIMER_TAG_RECOGNITION_IMPLEMENTATION.md)
- [藏宝阁增强功能](project-nexus/VERIFY_TREASURE_EXIT_FIX.md)

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 运行特定测试文件
pnpm test path/to/test.ts
```

## 📜 脚本命令

```bash
# 开发
pnpm dev              # 启动开发服务器（端口 3001）
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器

# 数据库
pnpm db:push          # 推送 schema 变更
pnpm db:studio        # 打开 Prisma Studio
pnpm db:migrate       # 运行迁移
pnpm db:wake          # 唤醒 Neon 数据库

# 测试
pnpm test             # 运行测试一次
pnpm test:watch       # 监听模式运行测试

# AI 功能
pnpm ai-summary       # 生成每日 AI 总结
pnpm ai-summary:test  # 测试 AI 总结生成

# 演示数据
pnpm ensure-demo      # 创建演示用户
pnpm seed-demo        # 填充演示数据
pnpm setup-demo       # 完整演示设置
```

## 🏗️ 项目结构

```
project-nexus/
├── app/                      # Next.js App Router
│   ├── api/                 # API 路由
│   │   ├── treasures/      # 藏宝阁 API
│   │   ├── timer-tasks/    # 计时系统 API
│   │   ├── feeds/          # 信息流聚合 API
│   │   └── ...
│   ├── components/          # React 组件
│   │   ├── features/       # 功能特定组件
│   │   ├── shared/         # 可复用组件
│   │   └── ui/             # UI 基础组件（shadcn/ui）
│   ├── features/           # 功能页面
│   ├── hooks/              # 自定义 React Hooks
│   └── lib/                # 客户端工具函数
├── lib/                     # 服务端工具函数
│   ├── ai/                 # AI 集成
│   ├── auth-utils.ts       # 认证辅助函数
│   ├── prisma.ts           # Prisma 客户端
│   └── ...
├── prisma/                  # 数据库 schema
│   └── schema.prisma
├── scripts/                 # 自动化脚本
├── tests/                   # 测试文件
│   ├── api/               # API 测试
│   ├── components/        # 组件测试
│   └── integration/       # 集成测试
├── .kiro/                   # Kiro AI 配置
│   └── steering/          # 开发指南
└── types/                   # TypeScript 类型定义
```

## 🔑 核心功能详解

### AI 驱动的任务解析
自然语言输入如 "写代码 #前端 #React" 会自动解析为：
- 任务名称："写代码"
- 分类路径："工作/编程"
- 标签：["前端", "React"]

### 多源信息流聚合
统一界面聚合来自以下平台的内容：
- **Bilibili**：视频动态，带速率限制
- **Reddit**：帖子与嵌套评论
- **LinuxDO**：论坛讨论，带 AI 分析
- **小黑盒**：游戏社区内容

### 基于属性的测试
使用 fast-check 进行健壮测试：
```typescript
fc.assert(
  fc.property(
    fc.array(fc.string()),
    (tags) => {
      const result = parseInput(tags)
      expect(result.tags).toEqual(tags)
    }
  ),
  { numRuns: 100 }
)
```

## 🤝 贡献

1. Fork 本仓库
2. 创建功能分支（`git checkout -b feature/amazing-feature`）
3. 遵循[代码规范](project-nexus/.kiro/steering/code-standards.md)
4. 为新功能编写测试
5. 提交更改（`git commit -m 'feat: 添加某功能'`）
6. 推送到分支（`git push origin feature/amazing-feature`）
7. 开启 Pull Request

## 📝 许可证

本项目为私有项目。

## 🙏 致谢

- 基于 [Next.js](https://nextjs.org/) 构建
- UI 组件来自 [shadcn/ui](https://ui.shadcn.com/)
- 图标来自 [Lucide](https://lucide.dev/)
- AI 功能由 [Vercel AI SDK](https://sdk.vercel.ai/) 驱动
- 数据库由 [Neon](https://neon.tech/) 提供

## 📧 联系方式

如有问题或需要支持，请在 GitHub 上提交 issue。

---

**注意**：这是一个个人效率平台。设置帮助请参阅[快速开始指南](project-nexus/.kiro/steering/GETTING_STARTED.md)。
