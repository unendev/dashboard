# Treasure Pavilion RAG 实现 - 免费/低成本方案

## 💰 成本优化分析

你提到的关键点：
- ✅ Vercel 免费层够用
- ✅ API 一次对话 2分钱（可接受）
- ❓ 能否用 Hugging Face
- ❓ 免费向量数据库够不够用

**结论：完全可以实现免费/低成本的 RAG 系统！**

---

## 🎯 推荐方案：Hugging Face + 免费向量数据库

### 方案对比

| 方案 | Embedding 成本 | 向量数据库 | LLM 成本 | 总体评分 |
|------|---------------|-----------|----------|---------|
| **方案A：HF + Supabase** | 🟢 免费 | 🟢 免费 500MB | 🟡 2分/次 | ⭐⭐⭐⭐⭐ |
| **方案B：HF + Pinecone** | 🟢 免费 | 🟡 免费但限制多 | 🟡 2分/次 | ⭐⭐⭐⭐ |
| 方案C：OpenAI + Vercel DB | 🟡 $0.02/1M | 🟡 $10/月 | 🟡 2分/次 | ⭐⭐⭐ |

---

## 🤗 方案A：Hugging Face Embeddings（推荐！）

### 1. 使用 Hugging Face Inference API

**优点：**
- ✅ **完全免费**
- ✅ 无需下载模型（API调用）
- ✅ 多种模型可选
- ✅ 适合 Vercel 部署

**缺点：**
- ⚠️ 免费层有速率限制
- ⚠️ 响应可能较慢（冷启动）

### 实现代码

```typescript
// lib/rag-service-hf.ts
export class RAGServiceHF {
  // Hugging Face 推荐的 Embedding 模型
  private static readonly HF_MODELS = {
    // 多语言模型（推荐：支持中文）
    multilingual: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', // 384维
    
    // 英文模型（更快）
    english: 'sentence-transformers/all-MiniLM-L6-v2', // 384维
    
    // 中文模型（最适合你的场景）
    chinese: 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2', // 768维
    
    // 高性能多语言（推荐！）
    best: 'BAAI/bge-small-zh-v1.5', // 512维，专为中文优化
  };

  /**
   * 使用 Hugging Face Inference API 生成 embeddings
   * 完全免费！
   */
  static async generateEmbedding(
    text: string, 
    model: keyof typeof RAGServiceHF.HF_MODELS = 'best'
  ): Promise<number[]> {
    const apiKey = process.env.HUGGINGFACE_API_KEY; // 免费获取
    const modelName = this.HF_MODELS[model];
    
    if (!apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/${modelName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text,
            options: { wait_for_model: true } // 等待模型加载
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HF API error: ${response.status} - ${error}`);
      }

      const embedding = await response.json();
      
      // HF 返回的是二维数组，取第一个
      return Array.isArray(embedding[0]) ? embedding[0] : embedding;
    } catch (error) {
      console.error('Error generating HF embedding:', error);
      throw error;
    }
  }

  /**
   * 批量生成 embeddings（提高效率）
   */
  static async generateEmbeddingsBatch(
    texts: string[],
    model: keyof typeof RAGServiceHF.HF_MODELS = 'best'
  ): Promise<number[][]> {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    const modelName = this.HF_MODELS[model];
    
    if (!apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/${modelName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: texts,
            options: { wait_for_model: true }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HF API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating HF embeddings batch:', error);
      throw error;
    }
  }

  // 余弦相似度计算（同之前）
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

### 2. 获取免费 Hugging Face API Key

```bash
# 1. 访问 https://huggingface.co/
# 2. 注册账号（免费）
# 3. 进入 Settings -> Access Tokens
# 4. 创建新 token（选择 Read 权限即可）
# 5. 添加到 .env.local

HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
```

---

## 🗄️ 免费向量数据库对比

### 选项1：Supabase Vector（强烈推荐！）

**免费层配置：**
- ✅ 500MB PostgreSQL 数据库
- ✅ 无限 API 请求
- ✅ 内置 pgvector 扩展
- ✅ 每周暂停（只需点一下恢复）

**能存多少数据？**
```
假设使用 BAAI/bge-small-zh-v1.5 (512维)
每条 embedding 大小：512 × 4字节 = 2KB
其他字段（title, content等）：平均 2KB
总计：约 4KB/条

500MB 可存储：500MB ÷ 4KB ≈ 125,000 条！

你的实际场景：
- 个人宝藏库估计 < 1000 条
- 占用空间：4MB
- 免费层绰绰有余！✅
```

**实现步骤：**

#### 1. 创建 Supabase 项目

```bash
# 访问 https://supabase.com
# 创建免费项目（无需信用卡）
```

#### 2. 启用 pgvector

```sql
-- 在 Supabase SQL Editor 中运行
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 3. 创建表和索引

```sql
-- 创建带 embedding 字段的 treasures 表
CREATE TABLE treasures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  type TEXT NOT NULL,
  
  -- Embedding 字段（512维 for BAAI/bge-small-zh-v1.5）
  embedding vector(512),
  embedding_model TEXT,
  embedding_updated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建向量索引（HNSW 性能最好）
CREATE INDEX ON treasures 
USING hnsw (embedding vector_cosine_ops);

-- 创建搜索函数
CREATE OR REPLACE FUNCTION match_treasures(
  query_embedding vector(512),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  user_id_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  tags text[],
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    treasures.id,
    treasures.title,
    treasures.content,
    treasures.tags,
    1 - (treasures.embedding <=> query_embedding) as similarity
  FROM treasures
  WHERE 
    (user_id_filter IS NULL OR treasures.user_id = user_id_filter)
    AND 1 - (treasures.embedding <=> query_embedding) > match_threshold
  ORDER BY treasures.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

#### 4. 集成到项目

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // 服务端使用 service key
)
```

```typescript
// app/api/treasures/search-rag-free/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';
import { RAGServiceHF } from '@/lib/rag-service-hf';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    // 1. 生成查询的 embedding（免费！）
    const queryEmbedding = await RAGServiceHF.generateEmbedding(query, 'best');

    // 2. 在 Supabase 中搜索（免费！）
    const { data: treasures, error } = await supabase.rpc('match_treasures', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
      user_id_filter: userId
    });

    if (error) {
      throw error;
    }

    if (!treasures || treasures.length === 0) {
      return NextResponse.json({
        treasures: [],
        answer: '没有找到相关的宝藏内容。'
      });
    }

    // 3. 构建上下文
    const context = treasures
      .map((t: any) => `标题：${t.title}\n内容：${t.content}`)
      .join('\n\n---\n\n');

    // 4. 使用 DeepSeek 生成答案（2分钱/次）
    const answer = await generateAnswerWithDeepSeek(query, context);

    return NextResponse.json({
      treasures: treasures.map((t: any) => ({
        id: t.id,
        title: t.title,
        content: t.content,
        tags: t.tags,
        similarity: t.similarity
      })),
      answer
    });
  } catch (error) {
    console.error('Error in RAG search:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

async function generateAnswerWithDeepSeek(query: string, context: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { 
          role: 'system', 
          content: '你是一个智能助手，请基于提供的上下文回答用户问题。只使用上下文中的信息，如果找不到相关信息则明确说明。' 
        },
        { 
          role: 'user', 
          content: `上下文：\n${context}\n\n问题：${query}` 
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }),
  });

  const result = await response.json();
  return result.choices[0]?.message?.content || '无法生成回答';
}
```

---

### 选项2：Pinecone（免费层）

**免费层限制：**
- ⚠️ 1个索引
- ⚠️ 1000万向量（够用但有限制）
- ⚠️ 需要定期使用避免删除

**对比 Supabase：**
- Supabase 更适合你（无需单独管理向量数据库）
- Pinecone 适合纯向量搜索场景

---

### 选项3：Weaviate Cloud（免费层）

**免费层：**
- ✅ 14天免费试用
- ⚠️ 之后需付费

**不推荐原因：**
- 配置复杂
- 免费试用期短

---

## 💸 最终成本计算

### 推荐方案：HF + Supabase + DeepSeek

**月度成本（1000条宝藏，每天10次查询）：**

| 项目 | 成本 | 说明 |
|------|------|------|
| Hugging Face Embeddings | 🟢 $0 | 免费 API |
| Supabase 向量数据库 | 🟢 $0 | 免费 500MB |
| DeepSeek LLM | 🟡 $6 | 300次查询 × $0.02 |
| Vercel 托管 | 🟢 $0 | 免费层 |
| **总计** | **$6/月** | 🎉 超便宜！ |

**与其他方案对比：**
- OpenAI Embeddings + ChatGPT：~$50/月
- Anthropic Claude：~$100/月
- **节省 85%+ 成本！** ✅

---

## 🚀 完整实现步骤

### Step 1: 设置环境变量

```bash
# .env.local

# Hugging Face（免费）
HUGGINGFACE_API_KEY=hf_xxxxx

# Supabase（免费）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...

# DeepSeek（2分/次）
DEEPSEEK_API_KEY=sk-xxxxx
```

### Step 2: 安装依赖

```bash
npm install @supabase/supabase-js
```

### Step 3: 初始化 Supabase

参考上面的 SQL 脚本

### Step 4: 更新创建 Treasure 的逻辑

```typescript
// app/api/treasures/route.ts

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const validated = createTreasureSchema.parse(body);
    
    // 1. 生成 embedding（免费！）
    const text = `${validated.title}\n${validated.content || ''}`;
    const embedding = await RAGServiceHF.generateEmbedding(text, 'best');
    
    // 2. 保存到 Supabase（免费！）
    const { data, error } = await supabase
      .from('treasures')
      .insert({
        user_id: userId,
        title: validated.title,
        content: validated.content,
        type: validated.type,
        tags: validated.tags,
        theme: validated.theme,
        embedding: embedding,
        embedding_model: 'BAAI/bge-small-zh-v1.5',
        embedding_updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating treasure:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
```

### Step 5: 为现有数据生成 Embeddings

```typescript
// scripts/generate-embeddings-hf.ts

import { supabase } from '@/lib/supabase';
import { RAGServiceHF } from '@/lib/rag-service-hf';

async function generateAllEmbeddings() {
  // 获取所有没有 embedding 的 treasures
  const { data: treasures, error } = await supabase
    .from('treasures')
    .select('id, title, content')
    .is('embedding', null);
  
  if (error || !treasures) {
    console.error('Error fetching treasures:', error);
    return;
  }

  console.log(`找到 ${treasures.length} 条需要生成 embedding 的记录`);

  for (let i = 0; i < treasures.length; i++) {
    const treasure = treasures[i];
    const text = `${treasure.title}\n${treasure.content || ''}`;
    
    try {
      const embedding = await RAGServiceHF.generateEmbedding(text, 'best');
      
      const { error: updateError } = await supabase
        .from('treasures')
        .update({
          embedding,
          embedding_model: 'BAAI/bge-small-zh-v1.5',
          embedding_updated_at: new Date().toISOString()
        })
        .eq('id', treasure.id);
      
      if (updateError) throw updateError;
      
      console.log(`✅ [${i + 1}/${treasures.length}] ${treasure.title}`);
      
      // 避免触发速率限制（HF 免费层）
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    } catch (error) {
      console.error(`❌ 失败: ${treasure.title}`, error);
    }
  }

  console.log('🎉 所有 embeddings 生成完成！');
}

generateAllEmbeddings();
```

运行脚本：
```bash
npx tsx scripts/generate-embeddings-hf.ts
```

---

## ⚡ 性能优化

### 1. Hugging Face 速率限制处理

```typescript
// 添加重试逻辑
static async generateEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3
): Promise<number[]> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.generateEmbedding(text);
    } catch (error: any) {
      if (error.message.includes('503') && i < maxRetries - 1) {
        // 模型正在加载，等待后重试
        console.log(`模型加载中，等待 ${(i + 1) * 5} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 5000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 2. 缓存 Embeddings

```typescript
// 使用 Vercel KV 缓存（可选，不是必需）
import { kv } from '@vercel/kv';

static async generateEmbeddingCached(text: string): Promise<number[]> {
  // 计算文本哈希作为缓存key
  const hash = createHash('md5').update(text).digest('hex');
  const cacheKey = `emb:${hash}`;
  
  // 尝试从缓存获取
  const cached = await kv.get<number[]>(cacheKey);
  if (cached) {
    console.log('✅ 使用缓存的 embedding');
    return cached;
  }
  
  // 生成新的 embedding
  const embedding = await this.generateEmbedding(text);
  
  // 缓存 30 天
  await kv.set(cacheKey, embedding, { ex: 30 * 24 * 3600 });
  
  return embedding;
}
```

---

## 📊 方案总结

### 为什么推荐 HF + Supabase？

| 维度 | 评分 | 说明 |
|------|------|------|
| 💰 成本 | ⭐⭐⭐⭐⭐ | 几乎免费！ |
| 🚀 性能 | ⭐⭐⭐⭐ | 足够快（Supabase 有索引） |
| 🛠️ 易用性 | ⭐⭐⭐⭐ | 配置简单，文档完善 |
| 📈 可扩展性 | ⭐⭐⭐⭐ | 支持到十万级数据 |
| 🔒 可靠性 | ⭐⭐⭐⭐⭐ | Supabase 托管，稳定性高 |
| **总评** | **⭐⭐⭐⭐⭐** | **完美方案！** |

**你说的完全对：就像 Vercel 免费层对你绰绰有余，Supabase + HF 的免费层也完全够用！**

---

## 🎯 下一步行动

1. ✅ 注册 Hugging Face 账号获取免费 API key
2. ✅ 创建 Supabase 免费项目
3. ✅ 运行 SQL 脚本设置表和索引
4. ✅ 部署代码到 Vercel
5. ✅ 运行脚本为现有数据生成 embeddings
6. ✅ 开始使用！

**预计时间：2-3小时完成基础版，1天完成优化版**

有任何问题随时问我！🚀

