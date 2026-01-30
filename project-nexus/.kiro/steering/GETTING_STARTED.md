---
inclusion: manual
---

# Getting Started with Project Nexus

Quick start guide for new developers joining the project.

## Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 10.0.0
- **PostgreSQL**: Neon serverless database account

## Initial Setup

### 1. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install project dependencies
pnpm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure required environment variables:

```bash
# Database (Neon)
POSTGRES_PRISMA_URL=postgresql://...?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://...
SHADOW_DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=generate-a-secure-random-string

# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=...

# Optional: External APIs
BILIBILI_SESSDATA=...
```

### 3. Database Setup

```bash
# Wake the database and push schema
pnpm db:push

# Open Prisma Studio to verify
pnpm db:studio
```

### 4. Start Development Server

```bash
pnpm dev
```

Visit http://localhost:3001

## Project Structure Tour

```
project-nexus/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── treasures/      # Treasure Pavilion API
│   │   ├── timer-tasks/    # Timer system API
│   │   └── feeds/          # Feed aggregation API
│   ├── components/          # React components
│   │   ├── features/       # Feature-specific
│   │   ├── shared/         # Reusable
│   │   └── ui/             # UI primitives
│   └── [feature]/          # Feature pages
├── lib/                     # Server utilities
├── prisma/                  # Database schema
├── scripts/                 # Automation scripts
└── tests/                   # Test files
```

## Key Features to Explore

### 1. Timer System
- **Location**: `/log`
- **API**: `/api/timer-tasks`
- **Features**: Hierarchical tasks, instance tags, AI parsing

### 2. Treasure Pavilion
- **Location**: `/treasure-pavilion`
- **API**: `/api/treasures`
- **Features**: Content collection, AI tagging, image lightbox

### 3. Feed Aggregation
- **Location**: `/` (home page)
- **API**: `/api/feeds`
- **Sources**: Bilibili, Reddit, LinuxDO, Heybox

### 4. Progress Tracking
- **Location**: `/progress`
- **API**: `/api/progress`
- **Features**: Daily analysis, skill profiling

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes following steering rules**
   - Review relevant steering files in `.kiro/steering/`
   - Follow code standards and patterns

3. **Test your changes**
   ```bash
   pnpm test
   ```

4. **Commit with descriptive messages**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Database Changes

1. **Modify schema**
   ```prisma
   // prisma/schema.prisma
   model NewModel {
     id String @id @default(cuid())
     // fields...
   }
   ```

2. **Push changes**
   ```bash
   pnpm db:push
   ```

3. **Create migration (production)**
   ```bash
   pnpm db:migrate:create
   ```

### Adding AI Features

1. **Choose appropriate model** (see ai-integration.md)
2. **Implement with error handling**
3. **Add rate limiting**
4. **Test with mocked responses**

## Common Tasks

### Run Tests
```bash
pnpm test              # Run once
pnpm test:watch        # Watch mode
```

### Database Operations
```bash
pnpm db:push           # Push schema changes
pnpm db:studio         # Open Prisma Studio
pnpm db:migrate        # Run migrations
```

### Scripts
```bash
pnpm ai-summary        # Generate AI summary
pnpm ai-summary:test   # Test AI summary
pnpm ensure-demo       # Create demo user
```

## Troubleshooting

### Database Connection Issues
```bash
# Wake the database
pnpm db:wake
```

### Build Errors
```bash
# Clean and reinstall
rm -rf node_modules .next
pnpm install
pnpm build
```

### Type Errors
```bash
# Regenerate Prisma client
pnpm prisma generate
```

## Learning Resources

### Steering Rules
- **project-overview.md** - Architecture overview
- **code-standards.md** - Coding conventions
- **component-patterns.md** - React patterns
- **database-patterns.md** - Prisma best practices
- **ai-integration.md** - AI implementation guide
- **testing-guide.md** - Testing strategies

### External Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Vitest Docs](https://vitest.dev)

## Getting Help

1. **Check steering rules** in `.kiro/steering/`
2. **Review existing code** for similar patterns
3. **Run tests** to understand expected behavior
4. **Ask team members** for clarification

## Next Steps

1. ✅ Complete initial setup
2. 📖 Read steering rules
3. 🔍 Explore codebase
4. 🧪 Run tests
5. 🚀 Start building!
