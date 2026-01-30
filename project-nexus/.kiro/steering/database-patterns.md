---
inclusion: always
---

# Database Patterns

## Prisma Best Practices

### Schema Design

#### Multi-Tenancy
All user-owned data must include `userId` and cascade delete:
```prisma
model Treasure {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... other fields
}
```

#### Hierarchical Data
Use self-referential relations for tree structures:
```prisma
model TimerTask {
  id       String      @id @default(cuid())
  parentId String?
  parent   TimerTask?  @relation("TaskHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children TimerTask[] @relation("TaskHierarchy")
}
```

#### Many-to-Many with Metadata
Use explicit join tables for additional fields:
```prisma
model TimerTaskInstanceTag {
  id            String      @id @default(cuid())
  timerTaskId   String
  instanceTagId String
  createdAt     DateTime    @default(now())
  
  instanceTag   InstanceTag @relation(fields: [instanceTagId], references: [id], onDelete: Cascade)
  timerTask     TimerTask   @relation(fields: [timerTaskId], references: [id], onDelete: Cascade)
  
  @@unique([timerTaskId, instanceTagId])
}
```

### Query Patterns

#### User-Scoped Queries
Always filter by userId for user data:
```typescript
const treasures = await prisma.treasure.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
})
```

#### Ownership Verification
Verify ownership before updates/deletes:
```typescript
const existing = await prisma.treasure.findFirst({
  where: { id, userId }
})

if (!existing) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
```

#### Eager Loading
Include relations to avoid N+1 queries:
```typescript
const treasure = await prisma.treasure.findFirst({
  where: { id, userId },
  include: {
    images: {
      orderBy: { createdAt: 'asc' }
    },
    user: {
      select: { name: true, email: true }
    }
  }
})
```

#### Transactions
Use transactions for multi-step operations:
```typescript
await prisma.$transaction(async (tx) => {
  // Delete old images
  await tx.image.deleteMany({
    where: { treasureId: id }
  })
  
  // Update treasure with new images
  await tx.treasure.update({
    where: { id },
    data: {
      title,
      images: {
        create: newImages
      }
    }
  })
})
```

### Migrations

#### Creating Migrations
```bash
pnpm db:migrate:create
```

#### Applying Migrations
```bash
pnpm db:migrate
```

#### Schema Push (Development)
```bash
pnpm db:push
```

### Indexing Strategy

#### Single Field Indexes
```prisma
model Article {
  slug String @unique
  
  @@index([slug])
}
```

#### Composite Indexes
```prisma
model AISummary {
  userId String
  date   String
  
  @@unique([userId, date])
  @@index([userId, date])
}
```

#### Unique Constraints
Prevent duplicates with unique constraints:
```prisma
model InstanceTag {
  userId String
  name   String
  
  @@unique([userId, name])
}
```

## Neon Database

### Connection Management
- Use connection pooling (POSTGRES_PRISMA_URL)
- Use direct connection for migrations (POSTGRES_URL_NON_POOLING)
- Wake database before operations (scripts/wake-db.mjs)

### Environment Variables
```bash
POSTGRES_PRISMA_URL=postgresql://...?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://...
SHADOW_DATABASE_URL=postgresql://...
```

### Wake Database Script
Always wake database before schema operations:
```typescript
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.POSTGRES_URL_NON_POOLING)
await sql`SELECT 1` // Wake the database
```

## Common Patterns

### Soft Delete
Add `deletedAt` field instead of hard delete:
```prisma
model Article {
  deletedAt DateTime?
}
```

Query active records:
```typescript
const articles = await prisma.article.findMany({
  where: { 
    userId,
    deletedAt: null 
  }
})
```

### Timestamps
Always include created/updated timestamps:
```prisma
model Example {
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### JSON Fields
Use JSON for flexible/nested data:
```prisma
model UserLayout {
  layoutConfig Json
}
```

Access in TypeScript:
```typescript
const layout = await prisma.userLayout.findUnique({
  where: { userId }
})

const config = layout.layoutConfig as LayoutConfig
```

### Array Fields
Use arrays for simple lists:
```prisma
model Treasure {
  tags   String[] @default([])
  aiTags String[] @default([])
}
```

Query with array operators:
```typescript
const treasures = await prisma.treasure.findMany({
  where: {
    tags: {
      hasSome: ['react', 'typescript']
    }
  }
})
```

## Performance Tips

1. **Use select to limit fields**:
   ```typescript
   const users = await prisma.user.findMany({
     select: { id: true, name: true }
   })
   ```

2. **Paginate large result sets**:
   ```typescript
   const treasures = await prisma.treasure.findMany({
     take: 20,
     skip: page * 20,
     orderBy: { createdAt: 'desc' }
   })
   ```

3. **Use findFirst for single results**:
   ```typescript
   // Faster than findUnique when filtering by non-unique fields
   const treasure = await prisma.treasure.findFirst({
     where: { id, userId }
   })
   ```

4. **Batch operations**:
   ```typescript
   await prisma.treasure.createMany({
     data: treasures,
     skipDuplicates: true
   })
   ```
