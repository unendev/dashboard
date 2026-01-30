# Steering Rules Summary

Generated comprehensive steering rules for Project Nexus workspace.

## Overview

Steering rules provide context-aware guidance to AI assistants, ensuring consistent code quality, patterns, and best practices across the project.

## Generated Files

### Core Documentation (9 files)

1. **project-overview.md** (2.3 KB)
   - Tech stack: Next.js 15, React 19, TypeScript, Prisma, Neon
   - Project structure and directory organization
   - Core features overview
   - Development commands

2. **code-standards.md** (5.0 KB)
   - TypeScript strict mode conventions
   - React component patterns (client vs server)
   - API route structure and error handling
   - Prisma query patterns
   - Structured logging with emoji prefixes
   - Performance best practices

3. **component-patterns.md** (5.1 KB)
   - Component organization structure
   - Image lightbox pattern
   - Lazy loading with LazyNextImage
   - Modal/Dialog patterns with Radix UI
   - Form handling patterns
   - Data fetching (server and client)
   - Responsive design with Tailwind
   - Touch gestures and keyboard navigation
   - Body scroll prevention

4. **database-patterns.md** (5.6 KB)
   - Prisma schema design principles
   - Multi-tenancy patterns
   - Hierarchical data structures
   - Query patterns (user-scoped, ownership verification)
   - Transaction handling
   - Migration workflow
   - Indexing strategy
   - Neon database configuration
   - Performance optimization tips

5. **ai-integration.md** (4.3 KB)
   - Supported AI providers (OpenAI, DeepSeek, Google Vertex AI)
   - Environment variable configuration
   - Streaming responses pattern
   - Structured output with Zod schemas
   - AI features: tag suggestion, task parsing, daily summary
   - Prompt engineering best practices
   - Rate limiting and cost management
   - Error handling for AI APIs
   - Testing AI features with mocks
   - Model selection guide

6. **external-apis.md** (5.8 KB)
   - Rate limiting strategies
   - API-specific guidelines (Bilibili, Reddit, Twitter, YouTube)
   - Sequential requests with jitter delays
   - Authentication patterns
   - Error handling (network, API-specific)
   - Proxy configuration
   - Response transformation to FeedItem
   - Caching strategies (database, memory, Next.js)
   - Testing external APIs with mocks

7. **authentication.md** (3.3 KB)
   - NextAuth.js v4 configuration
   - Authentication patterns (server components, API routes, client)
   - Authorization patterns (resource ownership, multi-tenant queries)
   - getUserId utility helper
   - Session management and extension
   - Security best practices

8. **testing-guide.md** (5.5 KB)
   - Property-based testing with Vitest and fast-check
   - Test structure and documentation
   - Common generators for test data
   - Example properties (data transformation, boundaries, navigation)
   - API testing with mocked fetch
   - Component testing with React Testing Library
   - Integration tests with Prisma
   - Running tests and best practices

9. **README.md** (2.6 KB)
   - Overview of all steering files
   - How steering works (always/conditional/manual inclusion)
   - Quick reference guide
   - Key principles summary
   - Updating steering rules
   - File reference syntax

10. **GETTING_STARTED.md** (4.8 KB)
    - Prerequisites and initial setup
    - Environment configuration guide
    - Database setup steps
    - Project structure tour
    - Key features to explore
    - Development workflow
    - Common tasks and commands
    - Troubleshooting guide
    - Learning resources

## Key Principles Captured

### 1. Type Safety
- Strict TypeScript mode enabled
- No implicit any
- Explicit type definitions
- Path aliases (@/ and @dashboard/shared)

### 2. User Isolation
- All user data filtered by userId
- Ownership verification before mutations
- Multi-tenant query patterns
- Cascade delete on user relations

### 3. Error Handling
- Structured logging with emoji prefixes (✅ ❌ ⚠️ 📝)
- Context objects in logs
- Appropriate HTTP status codes
- Try-catch in all API routes

### 4. Testing
- Property-based testing for logic invariants
- 50-100 iterations per property
- Mock external dependencies
- Test behavior, not implementation

### 5. Performance
- Lazy loading images
- Connection pooling (Neon)
- Query optimization (avoid N+1)
- Caching strategies (multi-level)
- Rate limiting external APIs

### 6. Security
- NextAuth.js for authentication
- Resource ownership verification
- Rate limiting with Upstash Redis
- Secure session management
- HTTPS in production

## Usage

### For AI Assistants

All files with `inclusion: always` are automatically loaded into context when working in the project-nexus workspace. This ensures consistent adherence to project patterns.

### For Developers

1. **Starting new features**: Review project-overview.md and code-standards.md
2. **API development**: Check external-apis.md and authentication.md
3. **Database work**: Reference database-patterns.md
4. **AI features**: Review ai-integration.md
5. **Testing**: Follow testing-guide.md patterns
6. **Component development**: Use component-patterns.md
7. **Onboarding**: Start with GETTING_STARTED.md

### Manual Inclusion

Use `#filename` in chat to include specific guides:
- `#README` - Steering overview
- `#GETTING_STARTED` - Setup guide

## File Statistics

Total: 10 files, ~40 KB of documentation

| File | Size | Purpose |
|------|------|---------|
| project-overview.md | 2.3 KB | Architecture & features |
| code-standards.md | 5.0 KB | Coding conventions |
| component-patterns.md | 5.1 KB | React patterns |
| database-patterns.md | 5.6 KB | Prisma best practices |
| ai-integration.md | 4.3 KB | AI implementation |
| external-apis.md | 5.8 KB | API integration |
| authentication.md | 3.3 KB | Auth & authorization |
| testing-guide.md | 5.5 KB | Testing strategies |
| README.md | 2.6 KB | Overview |
| GETTING_STARTED.md | 4.8 KB | Setup guide |

## Benefits

1. **Consistency**: All code follows established patterns
2. **Onboarding**: New developers have clear guidelines
3. **Quality**: Best practices are documented and enforced
4. **Efficiency**: AI assistants provide context-aware suggestions
5. **Maintainability**: Patterns are documented and searchable

## Next Steps

1. ✅ Steering rules generated
2. 📝 Review and customize as needed
3. 🔄 Keep updated as patterns evolve
4. 📚 Reference in development workflow
5. 🤖 Let AI assistants use for context

---

Generated: 2026-01-30
Location: `project-nexus/.kiro/steering/`
