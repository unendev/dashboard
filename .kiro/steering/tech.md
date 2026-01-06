# Technology Stack & Build System

## Core Framework & Language

- **Frontend Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript 5.x (strict mode)
- **Package Manager**: pnpm (>=10.0.0)
- **Node.js**: >=18.0.0

## Frontend Stack

- **Styling**: Tailwind CSS 3.x + PostCSS
- **UI Components**: shadcn/ui (Radix UI based)
- **State Management**: React Hooks + Context API + Zustand
- **Data Fetching**: SWR + React Query (@tanstack/react-query)
- **Form Validation**: Zod

## Backend & Database

- **Runtime**: Node.js (Next.js API Routes)
- **Database**: PostgreSQL (latest)
- **ORM**: Prisma 6.x
- **Authentication**: NextAuth.js 4.x + bcryptjs
- **Database Pooling**: Neon serverless (supports connection pooling)

## Key Libraries & Integrations

### UI & Interaction
- `@dnd-kit/core` - Advanced drag-and-drop system
- `@dnd-kit/sortable` - Sortable lists
- `lucide-react` - Icon library
- `react-markdown` - Markdown rendering
- `rehype-highlight`, `remark-gfm` - Markdown extensions

### Data Visualization
- `echarts` + `echarts-for-react` - Complex charts
- `recharts` - React chart library
- `d3-force` - Force-directed graphs
- `dagre` - Graph layout

### Content Management
- `@tiptap/react` - Rich text editor
- `epubjs` - EPUB reader
- `react-epub-viewer` - EPUB viewer component
- `browser-image-compression` - Client-side image compression

### AI & External Services
- `@ai-sdk/deepseek` - DeepSeek API integration
- `@ai-sdk/google` - Google Gemini integration
- `@ai-sdk/openai` - OpenAI integration
- `@ai-sdk/react` - AI SDK React hooks
- `ai` - Vercel AI SDK (core)

### Storage & File Handling
- `ali-oss` - Aliyun OSS integration
- `@vercel/blob` - Vercel Blob storage
- `jszip` - ZIP file handling
- `webdav` - WebDAV client

### Real-time & Collaboration
- `@liveblocks/client`, `@liveblocks/react` - Real-time collaboration
- `node-cron` - Scheduled tasks

### Utilities
- `axios` - HTTP client
- `rss-parser` - RSS feed parsing
- `bili-api` - Bilibili API wrapper
- `clsx`, `tailwind-merge` - CSS utilities

## Build & Development Commands

### Development
```bash
npm run dev          # Start dev server on port 10000
npm run lint         # Run ESLint
```

### Production Build
```bash
npm run build        # Build for production
npm start            # Start production server
```

### Database Management
```bash
npm run db:push              # Push schema changes (with DB wake)
npm run db:migrate           # Run pending migrations
npm run db:migrate:create    # Create new migration
npm run db:studio            # Open Prisma Studio
npm run db:wake              # Wake up serverless database
```

### Data & Setup
```bash
npm run ensure-demo          # Create demo user
npm run seed-demo            # Seed demo data
npm run setup-demo           # Both ensure-demo + seed-demo
```

### AI & Cron Tasks
```bash
npm run cron                 # Run daily summary cron job
npm run cron:test            # Test cron job
npm run ai-summary           # Generate AI summary
npm run ai-summary:test      # Test AI summary
npm run test:ai              # Test AI service
```

## Configuration Files

- **tsconfig.json**: TypeScript strict mode, path aliases (`@/*`)
- **next.config.ts**: Image domain whitelist, ESLint ignore
- **tailwind.config.ts**: Tailwind customization
- **eslint.config.mjs**: ESLint rules
- **postcss.config.mjs**: PostCSS plugins
- **.env.example**: Environment variable template

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_PRISMA_URL` - Prisma connection URL
- `POSTGRES_URL_NON_POOLING` - Direct connection (non-pooling)
- `NEXTAUTH_URL` - NextAuth callback URL
- `NEXTAUTH_SECRET` - Session encryption key

### Optional (AI & Storage)
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `ALIYUN_OSS_*` - Aliyun OSS credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `NEXT_PUBLIC_DEMO_MODE` - Enable demo mode (default: true)

## Code Quality & Type Safety

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended config
- **Type Coverage**: >95% (all major files typed)
- **Path Aliases**: `@/*` maps to project root for clean imports

## Performance Considerations

- **Image Optimization**: Next.js Image component with lazy loading
- **Code Splitting**: Automatic via Next.js App Router
- **Database**: Connection pooling via Neon
- **Caching**: SWR + React Query with stale-while-revalidate
- **Compression**: Browser-side image compression before upload

## Testing

- **E2E Testing**: Playwright (@playwright/test)
- **Test Config**: playwright.config.ts
- **Test Location**: tests/e2e/

## Deployment

- **Primary**: Vercel (Next.js native)
- **Docker**: Dockerfile + docker-compose.yml available
- **Database**: Neon serverless PostgreSQL
- **Storage**: Aliyun OSS or Vercel Blob

## Development Workflow

1. Install dependencies: `pnpm install`
2. Setup environment: Copy `.env.example` to `.env`
3. Initialize database: `npm run db:push`
4. Seed demo data: `npm run setup-demo`
5. Start dev server: `npm run dev`
6. Access at: http://localhost:10000
