---
inclusion: manual
---

# Steering Rules Overview

This directory contains steering rules that guide development in the Project Nexus workspace. These rules are automatically included in AI assistant context to ensure consistent code quality and patterns.

## Available Steering Files

### Always Included

1. **project-overview.md** - Tech stack, project structure, and core features
2. **code-standards.md** - TypeScript, React, and API route conventions
3. **component-patterns.md** - Common React component patterns and best practices
4. **database-patterns.md** - Prisma queries, schema design, and performance tips
5. **ai-integration.md** - AI provider setup, prompt engineering, and usage patterns
6. **external-apis.md** - Rate limiting, error handling, and API-specific guidelines
7. **authentication.md** - NextAuth.js patterns and authorization best practices
8. **testing-guide.md** - Property-based testing with Vitest and fast-check

### Manual Inclusion

- **README.md** (this file) - Use `#README` to include

## How Steering Works

Steering files provide context-aware guidance to AI assistants:

- **Always included**: Core patterns and standards are always available
- **Conditional**: Can be triggered by file patterns (not used in this project yet)
- **Manual**: Include specific guides with `#filename` in chat

## Quick Reference

### When to Reference

- **Starting new features**: Review project-overview.md and code-standards.md
- **API development**: Check external-apis.md and authentication.md
- **Database work**: Reference database-patterns.md
- **AI features**: Review ai-integration.md
- **Testing**: Follow testing-guide.md patterns
- **Component development**: Use component-patterns.md

### Key Principles

1. **Type Safety**: Strict TypeScript, no implicit any
2. **User Isolation**: Always filter by userId for user data
3. **Error Handling**: Structured logging with context
4. **Testing**: Property-based tests for logic invariants
5. **Performance**: Lazy loading, caching, and query optimization
6. **Security**: Verify ownership, rate limiting, secure sessions

## Updating Steering Rules

When project patterns evolve:

1. Update relevant steering file
2. Keep examples current with actual code
3. Document breaking changes
4. Maintain consistency across files

## File References

Steering files can reference other project files:
```markdown
#[[file:prisma/schema.prisma]]
```

This allows including specs, schemas, or documentation directly in steering context.
