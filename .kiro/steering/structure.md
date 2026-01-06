# Project Structure & Organization

## Directory Layout

```
project-nexus/
├── app/                              # Next.js App Router (main application)
│   ├── api/                          # API routes (43 endpoints)
│   │   ├── ai-summary/              # AI summary generation
│   │   ├── timer-tasks/             # Timer task CRUD operations
│   │   ├── todos/                   # Todo management
│   │   ├── treasures/               # Treasure pavilion operations
│   │   ├── auth/                    # Authentication endpoints
│   │   └── [other features]/        # Additional API routes
│   │
│   ├── components/                   # React components
│   │   ├── features/                # Feature-specific components
│   │   │   ├── dashboard/           # Dashboard widgets
│   │   │   ├── log/                 # Log system components
│   │   │   ├── timer/               # Timer & nested task components
│   │   │   ├── todo/                # Todo management UI
│   │   │   ├── treasure/            # Treasure pavilion UI
│   │   │   └── widgets/             # Reusable widgets
│   │   ├── ui/                      # Base UI components (shadcn/ui)
│   │   ├── auth/                    # Auth-related components
│   │   ├── layout/                  # Layout components
│   │   └── shared/                  # Shared/common components
│   │
│   ├── dashboard/                    # Dashboard page
│   ├── log/                         # Log system page
│   ├── treasure-pavilion/           # Treasure pavilion page
│   ├── todo/                        # Todo management page
│   ├── progress/                    # Progress tracking page
│   ├── review/                      # Review/analytics page
│   ├── webread/                     # E-book reader page
│   ├── russian/                     # Russian learning page
│   ├── sea-turtle-soup/             # Game/puzzle page
│   │
│   ├── auth/                        # Auth pages (login, register)
│   ├── dev-auth/                    # Development auth helpers
│   ├── install/                     # Installation/setup pages
│   ├── oauth-test/                  # OAuth testing
│   │
│   ├── hooks/                       # Custom React hooks
│   ├── lib/                         # App-specific utilities
│   ├── actions.ts                   # Server Actions
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Home page
│   ├── globals.css                  # Global styles
│   └── favicon.ico                  # Favicon
│
├── lib/                             # Core libraries & utilities
│   ├── ai/                          # AI service implementations
│   ├── ai-config.ts                 # AI provider configuration
│   ├── ai-provider.ts               # AI provider factory
│   ├── ai-service.ts                # Main AI service
│   ├── ai-summary-service.ts        # AI summary generation
│   ├── auth.ts                      # NextAuth configuration
│   ├── auth-utils.ts                # Auth utilities
│   ├── category-cache.ts            # Category caching
│   ├── category-utils.ts            # Category utilities
│   ├── device-*.ts                  # Device detection & management
│   ├── ebook-cache.ts               # E-book caching
│   ├── env.ts                       # Environment variable validation
│   ├── fetch-utils.ts               # HTTP utilities with retry
│   ├── fsrs.ts                      # Spaced repetition algorithm
│   ├── gemini-vertex.ts             # Google Vertex AI integration
│   ├── image-display-utils.ts       # Image handling utilities
│   ├── instance-tag-cache.ts        # Instance tag caching
│   ├── markdown/                    # Markdown processing utilities
│   ├── oss-utils.ts                 # Aliyun OSS utilities
│   ├── prisma.ts                    # Prisma client singleton
│   ├── progress-ai-service.ts       # Progress AI analysis
│   ├── rag-service*.ts              # RAG (Retrieval-Augmented Generation)
│   ├── tag-*.ts                     # Tag utilities & caching
│   ├── task-merger.ts               # Task merging logic
│   ├── timer-*.ts                   # Timer utilities & database
│   ├── tiptap-extensions/           # Custom Tiptap editor extensions
│   ├── user-utils.ts                # User utilities
│   ├── utils.ts                     # General utilities
│   ├── validations/                 # Zod validation schemas
│   │   ├── log.ts
│   │   ├── timer-task.ts
│   │   ├── todo.ts
│   │   └── treasure.ts
│   ├── webdav-*.ts                  # WebDAV integration
│   └── swap-line-extension.ts       # Text editor extension
│
├── prisma/                          # Database schema & migrations
│   ├── schema.prisma                # Data model definitions (15+ tables)
│   └── migrations/                  # Database migration history
│
├── scripts/                         # Utility scripts
│   ├── daily-ai-summary.js          # Cron job for daily summaries
│   ├── daily-summary-cron.js        # Alternative cron implementation
│   ├── seed-demo-data.mjs           # Demo data seeding
│   ├── ensure-demo-user.mjs         # Demo user creation
│   ├── check-*.mjs                  # Data validation scripts
│   ├── cleanup-*.mjs                # Cleanup utilities
│   ├── migrate-*.mjs                # Data migration scripts
│   ├── test-*.js                    # Testing utilities
│   └── [other utilities]/           # Additional helper scripts
│
├── types/                           # TypeScript type definitions
│   ├── bili-api.d.ts                # Bilibili API types
│   ├── bili-user.d.ts               # Bilibili user types
│   ├── game.ts                      # Game types
│   ├── health-data.d.ts             # Health tracking types
│   ├── heybox.d.ts                  # Heybox API types
│   ├── linuxdo.d.ts                 # LinuxDo API types
│   ├── milestone.d.ts               # Milestone types
│   ├── next-auth.d.ts               # NextAuth extensions
│   └── reddit.d.ts                  # Reddit API types
│
├── public/                          # Static assets
│   ├── default-avatar.svg
│   ├── file.svg
│   ├── globe.svg
│   └── [other assets]/
│
├── tests/                           # Test files
│   ├── e2e/                         # End-to-end tests
│   └── reproduce-streaming.spec.ts  # Specific test cases
│
├── deployment/                      # Deployment configurations
│   └── docker/                      # Docker-related files
│
├── plans/                           # Project planning documents
│   ├── deployment-plan.md
│   ├── docker-deployment-guide.md
│   ├── environment-configuration.md
│   └── [other planning docs]/
│
├── doc/                             # Project documentation
│   ├── ARCHITECTURE.md              # System architecture
│   ├── IMPLEMENTATION-SUMMARY.md    # Implementation details
│   ├── GOC-Architecture.md          # GOC (Gemini-Oriented Chat) architecture
│   ├── ROOM-MANAGEMENT-GUIDE.md     # Real-time collaboration guide
│   └── [other documentation]/
│
├── config/                          # Configuration files
│   ├── bili-users.json              # Bilibili user configuration
│   └── linuxdo-report.json          # LinuxDo report config
│
├── data/                            # Data files
│   ├── linux.do_report_*.json       # LinuxDo reports
│   └── stories.json                 # Story data
│
├── logs/                            # Application logs
│   └── heybox_scraper.log
│
├── linuxdo-scraper/                 # Python scraper for LinuxDo
│   ├── linuxdo/                     # LinuxDo scraper module
│   ├── reddit_scraper/              # Reddit scraper module
│   ├── heybox_scraper/              # Heybox scraper module
│   ├── requirements.txt             # Python dependencies
│   └── [scraper scripts]/
│
├── .kiro/                           # Kiro IDE configuration
│   ├── steering/                    # Steering rules (this directory)
│   └── settings/                    # IDE settings
│
├── .vscode/                         # VS Code configuration
├── .github/                         # GitHub workflows & config
├── .vercel/                         # Vercel deployment config
├── .next/                           # Next.js build output (generated)
├── node_modules/                    # Dependencies (generated)
│
├── Configuration Files
│   ├── next.config.ts               # Next.js configuration
│   ├── tsconfig.json                # TypeScript configuration
│   ├── tailwind.config.ts           # Tailwind CSS configuration
│   ├── postcss.config.mjs           # PostCSS configuration
│   ├── eslint.config.mjs            # ESLint configuration
│   ├── playwright.config.ts         # Playwright test configuration
│   ├── liveblocks.config.ts         # Liveblocks configuration
│   ├── package.json                 # Project dependencies
│   ├── pnpm-lock.yaml               # Dependency lock file
│   ├── .env.example                 # Environment variable template
│   ├── .env.local                   # Local environment (git-ignored)
│   ├── .gitignore                   # Git ignore rules
│   ├── .dockerignore                # Docker ignore rules
│   ├── Dockerfile                   # Docker image definition
│   ├── docker-compose.yml           # Docker Compose configuration
│   └── middleware.ts                # Next.js middleware
│
└── Documentation
    ├── README.md                    # Main project documentation
    ├── QUICK-START.md               # Quick start guide
    ├── SETUP.md                     # Setup instructions
    ├── ARCHITECTURE.md              # Architecture documentation
    └── [other docs]/
```

## Key Architectural Patterns

### 1. Recursive Component Architecture
- **Location**: `app/components/features/timer/NestedTimerZone.tsx` (1270+ lines)
- **Pattern**: Self-referential components for unlimited nesting
- **Data Structure**: Prisma `parentId` self-relation in `TimerTask` model
- **Usage**: Timer tasks, todos, categories

### 2. API Route Organization
- **Location**: `app/api/`
- **Pattern**: RESTful endpoints organized by feature
- **Convention**: `[resource]/route.ts` for CRUD operations
- **Authentication**: NextAuth.js session validation

### 3. Component Organization
- **Location**: `app/components/`
- **Pattern**: Feature-based organization with shared utilities
- **Naming**: PascalCase for components, camelCase for utilities
- **Exports**: Barrel exports in index files

### 4. Utility & Service Layer
- **Location**: `lib/`
- **Pattern**: Singleton services (Prisma, Auth)
- **Caching**: Dedicated cache modules for performance
- **Validation**: Zod schemas in `lib/validations/`

### 5. Database Schema
- **Location**: `prisma/schema.prisma`
- **Pattern**: 15+ interconnected models
- **Key Relations**: User → Tasks, Treasures, Notes, etc.
- **Migrations**: Tracked in `prisma/migrations/`

## Naming Conventions

### Files & Folders
- **Components**: PascalCase (e.g., `TimerTask.tsx`)
- **Utilities**: camelCase (e.g., `timer-utils.ts`)
- **API routes**: lowercase with hyphens (e.g., `timer-tasks`)
- **Types**: PascalCase (e.g., `TimerTask.d.ts`)

### Code
- **React Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

## Import Paths

- **Absolute imports**: `@/` prefix (configured in tsconfig.json)
- **Example**: `import { Button } from '@/app/components/ui/button'`
- **Avoid**: Relative imports beyond 2-3 levels

## Data Flow

1. **User Action** → React Component
2. **Component** → Server Action or API Route
3. **API Route** → Prisma ORM
4. **Prisma** → PostgreSQL Database
5. **Response** → Component State Update (with optimistic updates)

## Performance Optimization Locations

- **Image Optimization**: `lib/image-display-utils.ts`
- **Caching**: `lib/*-cache.ts` files
- **Database Queries**: Prisma relations in `prisma/schema.prisma`
- **Component Splitting**: Feature-based code splitting via App Router

## Testing Structure

- **E2E Tests**: `tests/e2e/`
- **Config**: `playwright.config.ts`
- **Utilities**: `scripts/test-*.js`

## Documentation Structure

- **Architecture**: `doc/ARCHITECTURE.md`
- **Setup**: `SETUP.md`, `QUICK-START.md`
- **Planning**: `plans/` directory
- **Implementation**: `doc/IMPLEMENTATION-*.md`
