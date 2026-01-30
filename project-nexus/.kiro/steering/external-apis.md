---
inclusion: always
---

# External API Integration

## Rate Limiting Strategy

### General Principles
1. **Sequential requests**: Avoid concurrent requests to the same API
2. **Jitter delays**: Add random delays between requests
3. **Exponential backoff**: Retry with increasing delays on failures
4. **User-Agent headers**: Always include realistic User-Agent

### Example: Bilibili API
```typescript
// Sequential processing with delays
for (const user of users) {
  // 5-8 second delay to avoid rate limits
  await new Promise(r => setTimeout(r, 5000 + Math.random() * 3000))
  
  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': `https://space.bilibili.com/${user.uid}/video`,
      'Origin': 'https://space.bilibili.com'
    }
  })
}
```

## API-Specific Guidelines

### Bilibili API

#### Authentication
- Use SESSDATA cookie when available
- Store in environment variable: `BILIBILI_SESSDATA`

#### Rate Limits
- **Error -799**: Rate limit exceeded
- **Solution**: Increase delays to 5-8 seconds
- **Avoid**: Concurrent requests

#### Endpoints
```typescript
// User videos
const apiUrl = `https://api.bilibili.com/x/space/arc/search?mid=${uid}&ps=5&tid=0&pn=1&keyword=&order=pubdate`
```

#### Response Handling
```typescript
const json = await res.json() as BiliVideoResponse

if (json.code !== 0) {
  console.warn(`Bilibili API returned code ${json.code}:`, json.message)
  continue
}

const videos = json.data.list.vlist
```

### Reddit API

#### Configuration
- Use official Reddit API
- Implement OAuth if needed
- Store credentials securely

#### Data Structure
```typescript
interface RedditPost {
  id: string
  title: string
  url: string
  subreddit: string
  score: number
  num_comments: number
}
```

### Twitter/X API

#### Caching Strategy
- Cache tweets in database
- Set expiration time (e.g., 24 hours)
- Refresh on access if expired

```typescript
const cachedTweet = await prisma.twitterTweet.findUnique({
  where: { twitterId }
})

if (cachedTweet && cachedTweet.expiresAt > new Date()) {
  return cachedTweet
}
```

### YouTube API

#### Video Cache
```typescript
model YouTubeVideoCache {
  videoId      String    @unique
  title        String
  thumbnail    String
  cachedAt     DateTime  @default(now())
  expiresAt    DateTime
}
```

#### Quota Management
- YouTube API has daily quota limits
- Cache aggressively
- Batch requests when possible

## Error Handling

### Network Errors
```typescript
try {
  const res = await fetch(url, { 
    signal: AbortSignal.timeout(10000) // 10s timeout
  })
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  
  return await res.json()
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout')
  } else {
    console.error('Network error:', error)
  }
  return null
}
```

### API-Specific Errors
```typescript
const json = await res.json()

if (json.code !== 0) {
  // API returned error code
  console.warn(`API Error ${json.code}:`, json.message)
  
  if (json.code === -799) {
    // Rate limit - increase delay
    await new Promise(r => setTimeout(r, 10000))
  }
  
  return null
}
```

## Proxy Configuration

### When to Use Proxy
- API blocks your IP
- Geographic restrictions
- Rate limit circumvention

### Configuration
```typescript
import { HttpsProxyAgent } from 'https-proxy-agent'

const agent = process.env.HTTP_PROXY 
  ? new HttpsProxyAgent(process.env.HTTP_PROXY)
  : undefined

const res = await fetch(url, {
  // @ts-ignore
  agent
})
```

### Environment Variables
```bash
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
```

## Response Transformation

### Normalize to FeedItem
```typescript
interface FeedItem {
  id: string
  title: string
  link: string
  pubDate: string
  isoDate: string
  content: string
  contentSnippet?: string
  imageUrl?: string
  source: string
  sourceIcon: string
  author?: string
  categories?: string[]
}
```

### Example Transformation
```typescript
const items = videos.map(v => ({
  id: v.bvid,
  title: v.title,
  link: `https://www.bilibili.com/video/${v.bvid}`,
  pubDate: new Date(v.created * 1000).toUTCString(),
  isoDate: new Date(v.created * 1000).toISOString(),
  content: v.description || 'No description',
  imageUrl: v.pic.startsWith('//') ? `https:${v.pic}` : v.pic,
  source: `Bilibili - ${user.name}`,
  sourceIcon: '📺',
  author: user.name,
  categories: ['Video']
}))
```

## Caching Strategy

### Cache Levels
1. **Database cache**: Long-term storage (days/weeks)
2. **Memory cache**: Short-term (minutes/hours)
3. **Next.js cache**: `fetch` with `next: { revalidate }`

### Example
```typescript
const res = await fetch(apiUrl, {
  next: { revalidate: 300 } // 5 minutes
})
```

### Cache Invalidation
```typescript
// Invalidate on user action
await prisma.twitterTweet.deleteMany({
  where: {
    expiresAt: { lt: new Date() }
  }
})
```

## Testing External APIs

### Mock Responses
```typescript
import { vi } from 'vitest'

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ code: 0, data: mockData })
})
```

### Test Error Cases
```typescript
it('should handle API errors', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests'
  })
  
  const result = await fetchData()
  expect(result).toBeNull()
})
```
