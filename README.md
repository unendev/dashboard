# Project Nexus

A comprehensive personal productivity and content aggregation platform built with Next.js 15, featuring AI-powered insights, multi-source feed aggregation, and advanced task management.

## 🚀 Features

### 📊 Timer System
- Hierarchical task tracking with categories and subcategories
- AI-powered task parsing from natural language
- Instance tags for flexible task organization
- Real-time timer with pause/resume functionality
- Daily and weekly progress analytics

### 🎨 Treasure Pavilion
- Multi-format content collection (text, images, music)
- AI-powered tag suggestions
- Full-screen image lightbox with navigation
- Theme-based organization
- Rich text editing with TipTap

### 📰 Feed Aggregation
- Multi-source content aggregation:
  - Bilibili videos
  - Reddit posts with comments
  - LinuxDO forum discussions
  - Heybox gaming community
- Unified feed interface with filtering
- Custom tagging and categorization
- AI-powered content analysis

### 📈 Progress Tracking
- Daily progress analysis with AI insights
- Skill profiling and growth tracking
- Project timeline visualization
- Weekly milestone reviews
- Automated daily summaries

### 📚 Additional Features
- **WebRead**: EPUB reader with note-taking and AI analysis
- **Russian Learning**: Flashcard system with FSRS algorithm
- **Mind Maps**: Visual knowledge organization
- **Collaborative Rooms**: Real-time collaboration with Liveblocks
- **Notes**: Markdown-based note-taking

## 🛠️ Tech Stack

### Core
- **Framework**: Next.js 15.4.8 (App Router)
- **Runtime**: React 19.1.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4

### Backend
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Prisma 6.16
- **Authentication**: NextAuth.js v4
- **File Storage**: Vercel Blob / Aliyun OSS

### AI Integration
- **Providers**: OpenAI, DeepSeek, Google Vertex AI
- **SDK**: Vercel AI SDK
- **Features**: Streaming, structured output, multi-provider support

### Testing
- **Framework**: Vitest
- **Property-Based**: fast-check
- **E2E**: Playwright

### Development
- **Package Manager**: pnpm >= 10.0.0
- **Node Version**: >= 18.0.0
- **Monorepo**: pnpm workspaces

## 📦 Installation

### Prerequisites
```bash
# Install Node.js >= 18
# Install pnpm
npm install -g pnpm
```

### Setup
```bash
# Clone repository
git clone https://github.com/unendev/dashboard.git
cd dashboard/project-nexus

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Setup database
pnpm db:push

# Start development server
pnpm dev
```

Visit http://localhost:3001

## 🔧 Configuration

### Environment Variables

```bash
# Database (Neon)
POSTGRES_PRISMA_URL=postgresql://...?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://...
SHADOW_DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key

# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=...
GOOGLE_VERTEX_PROJECT_ID=...
GOOGLE_VERTEX_LOCATION=...

# File Storage
OSS_REGION=...
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
OSS_BUCKET=...

# Optional: External APIs
BILIBILI_SESSDATA=...
```

## 📖 Documentation

### Steering Rules
Comprehensive development guidelines in `.kiro/steering/`:
- [Project Overview](/.kiro/steering/project-overview.md) - Architecture and features
- [Code Standards](/.kiro/steering/code-standards.md) - Coding conventions
- [Component Patterns](/.kiro/steering/component-patterns.md) - React best practices
- [Database Patterns](/.kiro/steering/database-patterns.md) - Prisma guidelines
- [AI Integration](/.kiro/steering/ai-integration.md) - AI implementation guide
- [External APIs](/.kiro/steering/external-apis.md) - API integration patterns
- [Authentication](/.kiro/steering/authentication.md) - Auth & authorization
- [Testing Guide](/.kiro/steering/testing-guide.md) - Testing strategies
- [Getting Started](/.kiro/steering/GETTING_STARTED.md) - Onboarding guide

### Feature Documentation
- [Bilibili Integration](/doc/BILIBILI_INTEGRATION_SUMMARY.md)
- [Timer Tag Recognition](/TIMER_TAG_RECOGNITION_IMPLEMENTATION.md)
- [Treasure Pavilion Enhancements](/VERIFY_TREASURE_EXIT_FIX.md)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Run specific test file
pnpm test path/to/test.ts
```

## 📜 Scripts

```bash
# Development
pnpm dev              # Start dev server (port 3001)
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Prisma Studio
pnpm db:migrate       # Run migrations
pnpm db:wake          # Wake Neon database

# Testing
pnpm test             # Run tests once
pnpm test:watch       # Run tests in watch mode

# AI Features
pnpm ai-summary       # Generate daily AI summary
pnpm ai-summary:test  # Test AI summary generation

# Demo Data
pnpm ensure-demo      # Create demo user
pnpm seed-demo        # Seed demo data
pnpm setup-demo       # Complete demo setup
```

## 🏗️ Project Structure

```
project-nexus/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── treasures/      # Treasure Pavilion API
│   │   ├── timer-tasks/    # Timer system API
│   │   ├── feeds/          # Feed aggregation API
│   │   └── ...
│   ├── components/          # React components
│   │   ├── features/       # Feature-specific components
│   │   ├── shared/         # Reusable components
│   │   └── ui/             # UI primitives (shadcn/ui)
│   ├── features/           # Feature pages
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Client-side utilities
├── lib/                     # Server-side utilities
│   ├── ai/                 # AI integration
│   ├── auth-utils.ts       # Authentication helpers
│   ├── prisma.ts           # Prisma client
│   └── ...
├── prisma/                  # Database schema
│   └── schema.prisma
├── scripts/                 # Automation scripts
├── tests/                   # Test files
│   ├── api/               # API tests
│   ├── components/        # Component tests
│   └── integration/       # Integration tests
├── .kiro/                   # Kiro AI configuration
│   └── steering/          # Development guidelines
└── types/                   # TypeScript type definitions
```

## 🔑 Key Features Deep Dive

### AI-Powered Task Parsing
Natural language input like "写代码 #前端 #React" is automatically parsed into:
- Task name: "写代码"
- Category: "工作/编程"
- Tags: ["前端", "React"]

### Multi-Source Feed Aggregation
Unified interface for content from:
- **Bilibili**: Video feeds with rate limiting
- **Reddit**: Posts with nested comments
- **LinuxDO**: Forum discussions with AI analysis
- **Heybox**: Gaming community content

### Property-Based Testing
Using fast-check for robust testing:
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the [Code Standards](/.kiro/steering/code-standards.md)
4. Write tests for new features
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- AI powered by [Vercel AI SDK](https://sdk.vercel.ai/)
- Database by [Neon](https://neon.tech/)

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This is a personal productivity platform. For setup assistance, see [Getting Started Guide](/.kiro/steering/GETTING_STARTED.md).
