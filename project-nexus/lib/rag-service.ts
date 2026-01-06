// RAG Service - 简单实现示例
// 适用于 Vercel 部署环境

interface TreasureEmbedding {
  id: string;
  embedding: number[];
  text: string;
  metadata: {
    title: string;
    tags: string[];
    type: string;
  };
}

interface RAGSearchResult {
  treasures: Array<{
    id: string;
    title: string;
    content: string;
    similarity: number;
  }>;
  answer?: string;
}

export class RAGService {
  // 使用 OpenAI 或 DeepSeek API 生成 embeddings
  static async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small', // 便宜且效果好
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // 计算余弦相似度
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

  // 搜索相似的 treasures
  static async search(
    query: string,
    treasures: TreasureEmbedding[],
    topK: number = 5
  ): Promise<RAGSearchResult['treasures']> {
    // 生成查询的 embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // 计算所有 treasure 与查询的相似度
    const similarities = treasures.map(treasure => ({
      id: treasure.id,
      title: treasure.metadata.title,
      content: treasure.text,
      similarity: this.cosineSimilarity(queryEmbedding, treasure.embedding),
    }));

    // 按相似度排序并返回 top-K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  // RAG：检索 + 生成答案
  static async queryWithRAG(
    query: string,
    treasures: TreasureEmbedding[]
  ): Promise<RAGSearchResult> {
    // 1. 检索相关的 treasures
    const relevantTreasures = await this.search(query, treasures, 3);

    // 2. 如果没有相关内容，直接返回
    if (relevantTreasures.length === 0 || relevantTreasures[0].similarity < 0.5) {
      return {
        treasures: [],
        answer: '抱歉，我没有找到相关的内容。',
      };
    }

    // 3. 构建上下文
    const context = relevantTreasures
      .map(t => `标题：${t.title}\n内容：${t.content}`)
      .join('\n\n---\n\n');

    // 4. 使用 LLM 生成答案
    const answer = await this.generateAnswer(query, context);

    return {
      treasures: relevantTreasures,
      answer,
    };
  }

  // 使用 DeepSeek 生成答案
  static async generateAnswer(query: string, context: string): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const systemPrompt = `你是一个智能助手，专门帮助用户从他们的宝藏库中查找和理解信息。
请基于提供的上下文回答用户的问题。

规则：
1. 只使用提供的上下文信息回答
2. 如果上下文中没有相关信息，请明确说明
3. 回答要简洁明了，突出重点
4. 可以引用具体的标题或内容片段`;

    const userPrompt = `上下文信息：
${context}

用户问题：${query}

请基于上述上下文回答用户的问题。`;

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const result = await response.json();
      return result.choices[0]?.message?.content || '无法生成回答';
    } catch (error) {
      console.error('Error generating answer:', error);
      return '抱歉，生成回答时出现错误。';
    }
  }
}

