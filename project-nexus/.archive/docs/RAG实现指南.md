# Treasure Pavilion RAG 实现指南

## 📌 总体评估

在 Vercel 部署环境下实现 RAG 的难度：**⭐⭐⭐ 中等偏上**

## 🎯 实现难度拆解

| 组件 | 难度 | 时间估计 | 说明 |
|------|------|----------|------|
| 基础语义搜索 | ⭐⭐ | 1-2天 | 使用 OpenAI Embeddings API |
| pgvector 集成 | ⭐⭐⭐ | 3-5天 | 需要数据库迁移和索引优化 |
| 完整 RAG 系统 | ⭐⭐⭐⭐ | 1-2周 | 包含缓存、优化和错误处理 |
| 生产级优化 | ⭐⭐⭐⭐⭐ | 2-4周 | 性能优化、监控、成本控制 |

---

## 🏗️ 三种实现方案

### 方案 1：简单 RAG（推荐起步）

**优点：**
- ✅ 快速实现（1-2天）
- ✅ 无需复杂配置
- ✅ 成本可控
- ✅ 适合小规模数据（< 1000条）

**缺点：**
- ⚠️ 每次查询都要重新计算 embeddings（慢）
- ⚠️ 性能随数据量增长而下降
- ⚠️ 无向量索引优化

**实现步骤：**

```typescript
// 1. 安装依赖
// npm install openai

// 2. 配置环境变量
OPENAI_API_KEY=sk-xxx...
DEEPSEEK_API_KEY=sk-xxx...

// 3. 使用现有的 RAGService
// 见 lib/rag-service.ts

// 4. 调用示例
const result = await fetch('/api/treasures/search-rag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '如何学习编程？' })
});
```

**成本估算：**
- OpenAI text-embedding-3-small: $0.02 / 1M tokens
- DeepSeek Chat: $0.14 / 1M input tokens
- 每次查询约 0.001-0.01 USD

---

### 方案 2：pgvector 集成（推荐生产）

**优点：**
- ✅ 性能好（有索引支持）
- ✅ 支持大规模数据（> 10000条）
- ✅ 与现有数据库集成
- ✅ 支持混合查询

**缺点：**
- ⚠️ 需要数据库迁移
- ⚠️ 实现复杂度增加
- ⚠️ 需要 Vercel Postgres 或自托管

**实现步骤：**

#### 1. 启用 pgvector

```sql
-- 在 Vercel Postgres 中运行
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 2. 更新 Prisma Schema

```prisma
model Treasure {
  id            String          @id @default(cuid())
  title         String
  content       String?
  type          TreasureType
  tags          String[]        @default([])
  userId        String
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  
  // 新增：embedding 字段
  embedding     Unsupported("vector(1536)")?  // OpenAI ada-002/text-embedding-3-small
  embeddingModel String?        // 记录使用的模型
  embeddingUpdatedAt DateTime?  // 最后更新时间
  
  musicTitle    String?
  musicArtist   String?
  musicAlbum    String?
  musicUrl      String?
  musicCoverUrl String?
  theme         String?
  likesCount    Int             @default(0)
  images        Image[]
  likes         TreasureLike[]
  answers       TreasureAnswer[]
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("treasures")
}
```

#### 3. 创建向量索引

```sql
-- 创建 IVFFlat 索引（适合中等规模数据）
CREATE INDEX ON treasures USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 或者 HNSW 索引（更快但占用更多内存）
-- CREATE INDEX ON treasures USING hnsw (embedding vector_cosine_ops);
```

#### 4. 实现自动 embedding 生成

```typescript
// app/api/treasures/route.ts

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const validated = createTreasureSchema.parse(body);
    
    // 生成 embedding
    const text = `${validated.title}\n${validated.content || ''}`;
    const embedding = await RAGService.generateEmbedding(text);
    
    // 创建 treasure 并保存 embedding
    const treasure = await prisma.$executeRaw`
      INSERT INTO treasures (
        id, user_id, title, content, type, tags, theme,
        embedding, embedding_model, embedding_updated_at
      ) VALUES (
        gen_random_uuid()::text,
        ${userId},
        ${validated.title},
        ${validated.content},
        ${validated.type}::"TreasureType",
        ${validated.tags}::text[],
        ${validated.theme},
        ${embedding}::vector,
        'text-embedding-3-small',
        NOW()
      )
      RETURNING *
    `;
    
    return NextResponse.json(treasure, { status: 201 });
  } catch (error) {
    console.error('Error creating treasure:', error);
    return NextResponse.json({ error: 'Failed to create treasure' }, { status: 500 });
  }
}
```

#### 5. 实现向量搜索

```typescript
// app/api/treasures/search-rag/route.ts

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const { query, topK = 5 } = await request.json();
    
    // 生成查询 embedding
    const queryEmbedding = await RAGService.generateEmbedding(query);
    
    // 使用向量相似度搜索
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        title,
        content,
        tags,
        type,
        1 - (embedding <=> ${queryEmbedding}::vector) as similarity
      FROM treasures
      WHERE user_id = ${userId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT ${topK}
    `;
    
    // 如果相似度太低，不生成答案
    if (results.length === 0 || results[0].similarity < 0.5) {
      return NextResponse.json({
        treasures: [],
        answer: '抱歉，没有找到相关内容。'
      });
    }
    
    // 构建上下文并生成答案
    const context = results
      .map(r => `标题：${r.title}\n内容：${r.content}`)
      .join('\n\n---\n\n');
    
    const answer = await RAGService.generateAnswer(query, context);
    
    return NextResponse.json({
      treasures: results,
      answer
    });
  } catch (error) {
    console.error('Error in RAG search:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
```

**成本估算：**
- Vercel Postgres Pro: $10/月起
- OpenAI Embeddings: 同方案1
- 数据库存储：1536维 × 4字节 ≈ 6KB/条

---

### 方案 3：第三方向量数据库

**推荐服务：**

#### A. Supabase Vector（推荐）
- ✅ 免费层：500MB 数据库
- ✅ 基于 PostgreSQL + pgvector
- ✅ 自带 Auth、Storage
- ⭐ 适合全栈应用

```typescript
// 安装
npm install @supabase/supabase-js

// 配置
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// 搜索
const { data, error } = await supabase.rpc('match_treasures', {
  query_embedding: embedding,
  match_threshold: 0.5,
  match_count: 5
})
```

#### B. Pinecone
- ⚠️ 免费层限制较多
- ✅ 性能极佳
- ✅ 专业向量数据库

#### C. Weaviate Cloud
- ✅ 功能强大
- ⚠️ 学习曲线陡峭
- ⚠️ 配置复杂

---

## 🚀 推荐实施路径

### Phase 1: MVP（1周）
1. ✅ 使用方案1实现基础 RAG
2. ✅ 测试搜索质量
3. ✅ 评估性能和成本
4. ✅ 收集用户反馈

### Phase 2: 优化（2周）
1. ✅ 实现 embedding 缓存
2. ✅ 添加预生成 embeddings 的后台任务
3. ✅ 优化查询性能
4. ✅ 添加相关性阈值

### Phase 3: 生产级（1-2周）
1. ✅ 迁移到 pgvector（方案2）
2. ✅ 创建向量索引
3. ✅ 实现增量更新
4. ✅ 添加监控和告警

---

## 💰 成本对比

| 方案 | 月成本（1000条数据） | 月成本（10000条数据） | 查询延迟 |
|------|---------------------|---------------------|----------|
| 方案1 | ~$5-10 | ~$50-100 | 3-5秒 |
| 方案2 | ~$15-25 | ~$25-40 | 0.5-1秒 |
| 方案3a (Supabase) | 免费-$25 | $25-50 | 0.5-1秒 |
| 方案3b (Pinecone) | $70+ | $70+ | 0.1-0.3秒 |

---

## ⚠️ Vercel 环境注意事项

### 1. 冷启动优化
```typescript
// 使用轻量级库，避免大依赖
// ❌ 不要在 Vercel 上使用
import * as tf from '@tensorflow/tfjs';  // 太大！

// ✅ 使用 API 服务
import OpenAI from 'openai';  // 轻量级
```

### 2. 执行时间限制
```typescript
// Vercel Hobby: 10秒超时
// Vercel Pro: 60秒超时

// 如果数据量大，分批处理
const batches = chunk(treasures, 10);
for (const batch of batches) {
  await processBatch(batch);
}
```

### 3. 内存限制
```typescript
// 不要一次性加载所有数据到内存
// ❌ 错误
const allEmbeddings = await loadAllEmbeddings(); // OOM!

// ✅ 正确：使用数据库查询
const results = await prisma.$queryRaw`SELECT ... LIMIT 100`;
```

### 4. 边缘函数考虑
```typescript
// 如果使用 Vercel Edge Functions
// 限制：
// - 无法访问 Node.js APIs
// - 4MB 代码大小限制
// - 更严格的执行时间

// 适合：纯 API 调用的场景
export const runtime = 'edge';
```

---

## 📈 性能优化建议

### 1. 缓存策略
```typescript
// Redis/Vercel KV 缓存 embeddings
import { kv } from '@vercel/kv';

const cacheKey = `embedding:${treasureId}`;
let embedding = await kv.get(cacheKey);

if (!embedding) {
  embedding = await generateEmbedding(text);
  await kv.set(cacheKey, embedding, { ex: 86400 }); // 24小时
}
```

### 2. 批量生成
```typescript
// 为现有 treasures 批量生成 embeddings
// scripts/generate-embeddings.ts

import { prisma } from '@/lib/prisma';
import { RAGService } from '@/lib/rag-service';

async function generateAllEmbeddings() {
  const treasures = await prisma.treasure.findMany({
    where: { embedding: null },
    select: { id: true, title: true, content: true }
  });
  
  for (const treasure of treasures) {
    const text = `${treasure.title}\n${treasure.content || ''}`;
    const embedding = await RAGService.generateEmbedding(text);
    
    await prisma.$executeRaw`
      UPDATE treasures 
      SET embedding = ${embedding}::vector,
          embedding_model = 'text-embedding-3-small',
          embedding_updated_at = NOW()
      WHERE id = ${treasure.id}
    `;
    
    console.log(`✅ Generated embedding for: ${treasure.title}`);
    
    // 避免 Rate Limit
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

generateAllEmbeddings();
```

### 3. 混合搜索
```typescript
// 结合传统搜索和向量搜索
const results = await prisma.$queryRaw`
  SELECT *, 
    1 - (embedding <=> ${queryEmbedding}::vector) as vector_similarity,
    ts_rank(to_tsvector('english', title || ' ' || content), 
            plainto_tsquery('english', ${query})) as text_rank
  FROM treasures
  WHERE user_id = ${userId}
  ORDER BY (vector_similarity * 0.7 + text_rank * 0.3) DESC
  LIMIT 10
`;
```

---

## 🎓 学习资源

1. **pgvector 文档**
   - https://github.com/pgvector/pgvector

2. **OpenAI Embeddings Guide**
   - https://platform.openai.com/docs/guides/embeddings

3. **Vercel 性能优化**
   - https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching

4. **RAG 最佳实践**
   - https://www.pinecone.io/learn/retrieval-augmented-generation/

---

## 🎯 结论

**对于你的项目，我建议：**

1. **短期（1周内）**：使用方案1快速验证 RAG 的价值
   - 简单实现
   - 快速测试
   - 低风险

2. **中期（2-4周）**：如果效果好，迁移到方案2（pgvector）
   - 更好的性能
   - 更低的成本
   - 可扩展性

3. **长期**：根据数据规模和性能需求考虑专业向量数据库

**总体难度：中等偏上（⭐⭐⭐）**，但可以循序渐进地实现！

