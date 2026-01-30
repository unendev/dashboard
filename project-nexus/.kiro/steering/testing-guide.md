---
inclusion: always
---

# Testing Guide

## Testing Stack

- **Framework**: Vitest
- **Property-Based Testing**: fast-check
- **Component Testing**: React Testing Library (when needed)
- **E2E Testing**: Playwright

## Property-Based Testing

### Philosophy
Test invariants and properties, not specific examples:
- ✅ "For any valid input, output should have property X"
- ❌ "For input A, output should be B"

### Structure
```typescript
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('Feature Name', () => {
  it('Property: Description of invariant', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.string()),
        (num, strings) => {
          // Test implementation
          const result = functionUnderTest(num, strings)
          
          // Assert properties
          expect(result).toBeDefined()
          expect(result.length).toBe(num)
        }
      ),
      { numRuns: 50 }
    )
  })
})
```

### Common Generators
```typescript
// Integers
fc.integer({ min: 0, max: 100 })

// Strings
fc.string()
fc.stringMatching(/^[a-zA-Z0-9]+$/)

// Arrays
fc.array(fc.string(), { minLength: 1, maxLength: 10 })

// Objects
fc.record({
  id: fc.string(),
  count: fc.integer({ min: 0 })
})

// Custom generators
const imageGenerator = fc.record({
  id: fc.string(),
  url: fc.webUrl(),
  width: fc.integer({ min: 100, max: 4000 }),
  height: fc.integer({ min: 100, max: 4000 })
})
```


### Test Documentation
Document each property with feature reference:
```typescript
/**
 * Property 1: Tag Extraction
 * Feature: timer-tag-recognition, Property 1: AI解析器标签提取
 * Validates: Requirements 1.1, 4.1, 4.4
 * 
 * For any input containing # symbols, the AI parser should extract
 * the words after # as instanceTags (without the # symbol).
 */
it('Property 1: Should extract tags from input with # symbols', () => {
  // Test implementation
})
```

### Example Properties to Test

#### Data Transformation
```typescript
it('Round-trip conversion should preserve data', () => {
  fc.assert(
    fc.property(
      fc.array(fc.string()),
      (tags) => {
        const str = tags.join(',')
        const reconstructed = str === '' ? [] : str.split(',')
        expect(reconstructed).toEqual(tags)
      }
    )
  )
})
```

#### Boundary Conditions
```typescript
it('Index should be clamped to valid range', () => {
  fc.assert(
    fc.property(
      fc.integer(),
      fc.integer({ min: 1, max: 10 }),
      (index, length) => {
        const clamped = Math.max(0, Math.min(index, length - 1))
        expect(clamped).toBeGreaterThanOrEqual(0)
        expect(clamped).toBeLessThan(length)
      }
    )
  )
})
```

#### Navigation Logic
```typescript
it('Next navigation should cycle correctly', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 9 }),
      fc.integer({ min: 1, max: 10 }),
      (current, length) => {
        const next = current === length - 1 ? 0 : current + 1
        expect(next).toBeGreaterThanOrEqual(0)
        expect(next).toBeLessThan(length)
      }
    )
  )
})
```

## API Testing

### Mock Fetch
```typescript
import { vi } from 'vitest'

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' })
})
```

### Test API Routes
```typescript
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/endpoint/route'

it('should return data', async () => {
  const request = new NextRequest('http://localhost/api/endpoint')
  const response = await GET(request)
  const data = await response.json()
  
  expect(response.status).toBe(200)
  expect(data).toHaveProperty('id')
})
```

## Component Testing

### Setup
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('should render component', () => {
  render(<Component prop="value" />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

### User Interactions
```typescript
it('should handle click', async () => {
  const user = userEvent.setup()
  const handleClick = vi.fn()
  
  render(<Button onClick={handleClick}>Click</Button>)
  await user.click(screen.getByRole('button'))
  
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

## Integration Tests

### Database Tests
```typescript
import { prisma } from '@/lib/prisma'

beforeEach(async () => {
  // Clean database
  await prisma.treasure.deleteMany()
})

it('should create treasure', async () => {
  const treasure = await prisma.treasure.create({
    data: {
      title: 'Test',
      userId: 'test-user',
      type: 'TEXT'
    }
  })
  
  expect(treasure.id).toBeDefined()
})
```

## Running Tests

```bash
# Run all tests once
pnpm test

# Watch mode
pnpm test:watch

# Run specific file
pnpm test path/to/test.ts

# Run with coverage
pnpm test --coverage
```

## Best Practices

1. **Test behavior, not implementation**
2. **Use property-based testing for logic**
3. **Mock external dependencies**
4. **Keep tests fast and isolated**
5. **Document test properties clearly**
6. **Run 50-100 iterations for property tests**
7. **Test edge cases explicitly**
8. **Don't test AI accuracy (non-deterministic)**
