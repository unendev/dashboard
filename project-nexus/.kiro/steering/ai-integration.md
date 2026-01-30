---
inclusion: always
---

# AI Integration Guidelines

## Supported Providers

1. **OpenAI** (GPT-4, GPT-3.5)
2. **DeepSeek** (via @ai-sdk/deepseek)
3. **Google Vertex AI** (Gemini models)

## Configuration

### Environment Variables
```bash
# OpenAI
OPENAI_API_KEY=sk-...

# DeepSeek
DEEPSEEK_API_KEY=...

# Google Vertex AI
GOOGLE_VERTEX_PROJECT_ID=...
GOOGLE_VERTEX_LOCATION=...
```

## Usage Patterns

### Streaming Responses
```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: NextRequest) {
  const { messages } = await request.json()
  
  const result = await streamText({
    model: openai('gpt-4'),
    messages,
    temperature: 0.7,
  })
  
  return result.toDataStreamResponse()
}
```

### Structured Output
```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

const schema = z.object({
  tags: z.array(z.string()),
  category: z.string(),
  confidence: z.number()
})

const result = await generateObject({
  model: openai('gpt-4'),
  schema,
  prompt: 'Extract tags from this content...'
})
```

## AI Features

### 1. Tag Suggestion (Treasure Pavilion)
- **Endpoint**: `/api/treasures/ai-suggest-tags`
- **Model**: GPT-4 or DeepSeek
- **Purpose**: Suggest relevant tags for treasure content
- **Input**: Title, content, existing tags
- **Output**: Array of suggested tags with confidence scores

### 2. Timer Task Parsing
- **Endpoint**: `/api/timer-tasks/parse`
- **Model**: GPT-4
- **Purpose**: Parse natural language into structured task data
- **Input**: User text (e.g., "写代码 #前端 #React")
- **Output**: Task name, category path, instance tags

### 3. Daily AI Summary
- **Script**: `scripts/daily-ai-summary.js`
- **Model**: GPT-4
- **Purpose**: Generate insights from daily timer tasks
- **Output**: Summary, insights, skill analysis

### 4. Progress Analysis
- **Feature**: Daily progress tracking
- **Model**: GPT-4
- **Purpose**: Analyze work patterns and skill development
- **Output**: Skill profiles, project insights, recommendations

## Best Practices

### Prompt Engineering
1. **Be specific**: Provide clear instructions and examples
2. **Use system messages**: Set context and constraints
3. **Structure output**: Request JSON or specific formats
4. **Handle errors**: AI responses can be unpredictable

### Example Prompt Structure
```typescript
const systemPrompt = `You are a task parser. Extract:
1. Task name (without # tags)
2. Category path (e.g., "工作/编程")
3. Instance tags (words after #, without the # symbol)

Return JSON: { name, categoryPath, instanceTags: [] }`

const userPrompt = `Parse: "${userInput}"`
```

### Rate Limiting
- Implement per-user rate limits
- Use Upstash Redis for distributed rate limiting
- Provide clear error messages when limits exceeded

### Cost Management
- Use cheaper models for simple tasks (GPT-3.5, DeepSeek)
- Cache results when possible
- Implement token limits
- Monitor usage with logging

### Error Handling
```typescript
try {
  const result = await generateObject({ ... })
  return NextResponse.json(result.object)
} catch (error) {
  if (error.name === 'AI_APICallError') {
    // Handle API errors
    return NextResponse.json(
      { error: 'AI service unavailable' },
      { status: 503 }
    )
  }
  throw error
}
```

## Testing AI Features

### Mock Responses
```typescript
import { vi } from 'vitest'

vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: { tags: ['test'], category: 'test' }
  })
}))
```

### Property-Based Testing
- Test input validation
- Test output structure
- Test edge cases (empty input, special characters)
- Don't test AI accuracy (non-deterministic)

## Model Selection Guide

| Task | Recommended Model | Reason |
|------|------------------|---------|
| Tag suggestion | GPT-4 / DeepSeek | Requires understanding context |
| Task parsing | GPT-4 | Needs structured output |
| Summarization | GPT-3.5 / DeepSeek | Cost-effective for simple tasks |
| Analysis | GPT-4 | Complex reasoning required |
| Chat | GPT-4 | Best conversational quality |
