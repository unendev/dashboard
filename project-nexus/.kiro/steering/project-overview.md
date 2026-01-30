---
inclusion: always
---

# Project Nexus - Overview

## Tech Stack

- **Framework**: Next.js 15.4.8 (App Router)
- **Runtime**: React 19.1.0
- **Language**: TypeScript 5
- **Database**: PostgreSQL (Neon serverless) with Prisma ORM
- **Authentication**: NextAuth.js v4
- **Styling**: Tailwind CSS 3.4
- **Testing**: Vitest with property-based testing (fast-check)
- **Package Manager**: pnpm (>=10.0.0)
- **Node Version**: >=18.0.0

## Project Structure

```
project-nexus/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── components/        # React components
│   │   ├── features/     # Feature-specific components
│   │   ├── shared/       # Reusable components
│   │   └── ui/           # UI primitives
│   ├── features/         # Feature pages
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Client-side utilities
├── lib/                   # Server-side utilities
├── prisma/               # Database schema and migrations
├── scripts/              # Automation scripts
├── tests/                # Test files
│   ├── api/             # API tests
│   ├── components/      # Component tests
│   └── integration/     # Integration tests
└── types/                # TypeScript type definitions
```

## Core Features

1. **Timer System**: Task tracking with hierarchical categories and instance tags
2. **Treasure Pavilion**: Content collection with images, music, and AI tagging
3. **Feed Aggregation**: Multi-source content (Bilibili, Reddit, LinuxDO, Heybox)
4. **AI Integration**: Multiple AI providers (OpenAI, DeepSeek, Google Vertex AI)
5. **Progress Tracking**: Daily progress analysis with skill profiling
6. **WebRead**: EPUB reader with note-taking
7. **Russian Learning**: Flashcard system with FSRS algorithm
8. **Collaborative Features**: Liveblocks integration for real-time collaboration

## Development Commands

- `pnpm dev`: Start development server on port 3001
- `pnpm build`: Build for production
- `pnpm test`: Run tests once
- `pnpm test:watch`: Run tests in watch mode
- `pnpm db:push`: Push schema changes to database
- `pnpm db:studio`: Open Prisma Studio
