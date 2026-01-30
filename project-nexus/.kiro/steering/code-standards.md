---
inclusion: always
---

# Code Standards

## TypeScript

- **Strict mode enabled**: All code must pass TypeScript strict checks
- **No implicit any**: Always provide explicit types
- **Path aliases**: Use `@/` for imports from project root
- **Shared package**: Use `@dashboard/shared` for cross-workspace code

## React Components

### File Naming
- Components: PascalCase (e.g., `ImageLightbox.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useTreasureState.ts`)
- Utilities: camelCase (e.g., `auth-utils.ts`)

### Component Structure
```typescript
'use client' // Only when needed (client components)

import { useState, useEffect } from 'react'
import { ComponentProps } from './types'

export interface ComponentNameProps {
  // Props interface exported for testing
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // Component implementation
}
```

### Client vs Server Components
- Default to Server Components
- Use `'use client'` only when needed:
  - useState, useEffect, or other React hooks
  - Event handlers (onClick, onChange, etc.)
  - Browser APIs (localStorage, window, etc.)
  - Third-party libraries that require client-side

## API Routes

### Structure
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    // Implementation
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error description:', error)
    return NextResponse.json(
      { error: 'Error message' }, 
      { status: 500 }
    )
  }
}
```

### Error Handling
- Always wrap in try-catch
- Log errors with descriptive context
- Return appropriate HTTP status codes
- Use structured error logging:
  ```typescript
  console.error('❌ [CRITICAL] Operation Failed:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : 'No stack trace'
  })
  ```

### Authentication
- Use `getUserId(request)` helper for protected routes
- Verify ownership before mutations
- Return 401 for unauthenticated, 404 for unauthorized

## Database (Prisma)

### Queries
- Always include user filtering for multi-tenant data
- Use transactions for multi-step operations
- Include relations explicitly with `include`
- Order results consistently

### Example
```typescript
const treasure = await prisma.treasure.findFirst({
  where: { id, userId },
  include: {
    images: {
      orderBy: { createdAt: 'asc' }
    }
  }
})
```

## Logging

### Structured Logging
- Use emoji prefixes for visibility:
  - ✅ Success operations
  - ❌ Critical errors
  - ⚠️ Warnings
  - 📝 Info/debug
- Include context objects:
  ```typescript
  console.log('✅ [UPDATE] Treasure updated:', { 
    id: treasure.id, 
    type: treasure.type, 
    imagesCount: treasure.images.length 
  })
  ```

### Debug Points
- Label debug points alphabetically (A, B, C)
- Include full context at each point
- Use JSON.stringify for complex objects

## Testing

### Property-Based Testing
- Use `fast-check` for property-based tests
- Test invariants, not implementations
- Document properties with feature references
- Run 50-100 iterations per property

### Test Structure
```typescript
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('Component/Feature Name', () => {
  it('Property: Description of invariant', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (value) => {
          // Test implementation
          expect(result).toBe(expected)
        }
      ),
      { numRuns: 50 }
    )
  })
})
```

## Comments

### When to Comment
- Complex business logic
- Non-obvious workarounds
- API integration quirks
- Performance optimizations

### JSDoc for Public APIs
```typescript
/**
 * Generates a signed URL for OSS resources
 * @param ossKey - The OSS object key
 * @param expiresIn - Expiration time in seconds
 * @returns Signed URL string
 */
export function generateSignedUrl(ossKey: string, expiresIn: number): string
```

## Performance

### Images
- Use `LazyNextImage` component for lazy loading
- Configure remote patterns in `next.config.ts`
- Provide width/height for layout stability
- Use `unoptimized` for external CDNs

### API Calls
- Implement rate limiting (Upstash Redis)
- Add delays between sequential external API calls
- Cache responses when appropriate
- Use `next: { revalidate }` for fetch caching

### Database
- Use connection pooling (Neon)
- Avoid N+1 queries with proper includes
- Index frequently queried fields
- Use `findFirst` instead of `findUnique` when filtering by multiple fields
