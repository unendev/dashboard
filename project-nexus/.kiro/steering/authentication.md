---
inclusion: always
---

# Authentication & Authorization

## NextAuth.js Configuration

### Setup
- **Version**: NextAuth.js v4
- **Adapter**: Prisma Adapter
- **Session Strategy**: JWT

### Environment Variables
```bash
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key

# OAuth Providers (optional)
GITHUB_ID=...
GITHUB_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Authentication Patterns

### Server Components
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  return <div>Welcome {session.user.name}</div>
}
```

### API Routes
```typescript
import { getUserId } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    // User is authenticated, proceed
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    )
  }
}
```

### Client Components
```typescript
'use client'

import { useSession } from 'next-auth/react'

export function UserProfile() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') return <LoadingSpinner />
  if (status === 'unauthenticated') return <SignInButton />
  
  return <div>Hello {session.user.name}</div>
}
```

## Authorization Patterns

### Resource Ownership
Always verify user owns the resource:
```typescript
const treasure = await prisma.treasure.findFirst({
  where: { 
    id: treasureId,
    userId: session.user.id 
  }
})

if (!treasure) {
  return NextResponse.json(
    { error: 'Not found' }, 
    { status: 404 }
  )
}
```

### Multi-Tenant Queries
Filter all queries by userId:
```typescript
const treasures = await prisma.treasure.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: 'desc' }
})
```

## Helper Functions

### getUserId Utility
```typescript
import { getServerSession } from 'next-auth'

export async function getUserId(request: NextRequest): Promise<string> {
  const session = await getServerSession()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  
  return session.user.id
}
```

## Session Management

### Session Data
```typescript
interface Session {
  user: {
    id: string
    email: string
    name?: string
    image?: string
  }
  expires: string
}
```

### Extending Session
Add custom fields in NextAuth callbacks:
```typescript
callbacks: {
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.sub
    }
    return session
  }
}
```

## Security Best Practices

1. **Always validate userId**: Never trust client-provided user IDs
2. **Use HTTPS in production**: Set secure cookies
3. **Implement CSRF protection**: NextAuth handles this
4. **Rate limit auth endpoints**: Use Upstash Redis
5. **Hash passwords**: Use bcrypt for credential auth
6. **Validate email ownership**: Implement email verification
7. **Use secure session secrets**: Generate strong NEXTAUTH_SECRET
