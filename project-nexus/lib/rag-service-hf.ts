// RAG Service - Hugging Face 免费方案
// 使用 Hugging Face Inference API（完全免费）

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

export class RAGServiceHF {
  // Hugging Face 推荐的 Embedding 模型
  private static readonly HF_MODELS = {
    // 多语言模型
    multilingual: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', // 384维
    
    // 英文模型（更快）
    english: 'sentence-transformers/all-MiniLM-L6-v2', // 384维
    
    // 中文优化模型（推荐！）
    best: 'BAAI/bge-small-zh-v1.5', // 512维，专为中文优化
    
    // 备用模型
    backup: 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2', // 768维
  };

  /**
   * 使用 Hugging Face Inference API 生成 embeddings
   * 完全免费！无需下载模型
   */
  static async generateEmbedding(
    text: string, 
    model: keyof typeof RAGServiceHF.HF_MODELS = 'best'
  ): Promise<number[]> {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    const modelName = this.HF_MODELS[model];
    
    if (!apiKey) {
      throw new Error('Hugging Face API key not configured. Get one free at https://huggingface.co/settings/tokens');
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
            options: { 
              wait_for_model: true, // 等待模型加载（如果需要）
              use_cache: true // 使用缓存加速
            }
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HF API error: ${response.status} - ${error}`);
      }

      const embedding = await response.json();
      
      // HF 返回的可能是二维数组，需要取第一个
      const result = Array.isArray(embedding[0]) ? embedding[0] : embedding;
      
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error('Invalid embedding format from HF API');
      }
      
      return result;
    } catch (error) {
      console.error('Error generating HF embedding:', error);
      throw error;
    }
  }

  /**
   * 带重试机制的 embedding 生成
   * 处理 HF 模型加载延迟（503错误）
   */
  static async generateEmbeddingWithRetry(
    text: string,
    model: keyof typeof RAGServiceHF.HF_MODELS = 'best',
    maxRetries: number = 3
  ): Promise<number[]> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.generateEmbedding(text, model);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // 如果是 503（模型正在加载），等待后重试
        if (errorMessage.includes('503') && i < maxRetries - 1) {
          const waitTime = (i + 1) * 5000; // 5s, 10s, 15s
          console.log(`⏳ 模型加载中，等待 ${waitTime / 1000} 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // 其他错误或最后一次重试失败，抛出错误
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * 批量生成 embeddings
   * 一次性处理多个文本，提高效率
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

  /**
   * 计算余弦相似度
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vectors must have the same length (got ${a.length} and ${b.length})`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * 搜索相似的 treasures（内存版）
   * 适合小规模数据（< 1000条）
   */
  static async search(
    query: string,
    treasures: TreasureEmbedding[],
    topK: number = 5,
    threshold: number = 0.5
  ): Promise<RAGSearchResult['treasures']> {
    // 生成查询的 embedding
    const queryEmbedding = await this.generateEmbeddingWithRetry(query);

    // 计算所有 treasure 与查询的相似度
    const similarities = treasures.map(treasure => ({
      id: treasure.id,
      title: treasure.metadata.title,
      content: treasure.text,
      similarity: this.cosineSimilarity(queryEmbedding, treasure.embedding),
    }));

    // 过滤低相似度结果，按相似度排序并返回 top-K
    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * RAG：检索 + 生成答案
   */
  static async queryWithRAG(
    query: string,
    treasures: TreasureEmbedding[],
    topK: number = 3
  ): Promise<RAGSearchResult> {
    // 1. 检索相关的 treasures
    const relevantTreasures = await this.search(query, treasures, topK, 0.5);

    // 2. 如果没有相关内容，直接返回
    if (relevantTreasures.length === 0) {
      return {
        treasures: [],
        answer: '抱歉，我没有找到相关的内容。你可以尝试换个问法或添加更多相关的宝藏。',
      };
    }

    // 3. 构建上下文
    const context = relevantTreasures
      .map((t, index) => `[${index + 1}] 标题：${t.title}\n内容：${t.content}\n相似度：${(t.similarity * 100).toFixed(1)}%`)
      .join('\n\n---\n\n');

    // 4. 使用 DeepSeek 生成答案
    const answer = await this.generateAnswerWithDeepSeek(query, context);

    return {
      treasures: relevantTreasures,
      answer,
    };
  }

  /**
   * 使用 DeepSeek 生成答案（2分钱/次）
   */
  static async generateAnswerWithDeepSeek(query: string, context: string): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const systemPrompt = `你是一个智能助手，专门帮助用户从他们的宝藏库中查找和理解信息。

规则：
1. 只使用提供的上下文信息回答
2. 如果上下文中没有相关信息，请明确说明
3. 回答要简洁明了，突出重点
4. 可以引用具体的标题或内容片段（使用 [1], [2] 等标记）
5. 如果多个宝藏有相关内容，可以综合回答`;

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
        const error = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return result.choices[0]?.message?.content || '无法生成回答';
    } catch (error) {
      console.error('Error generating answer with DeepSeek:', error);
      return '抱歉，生成回答时出现错误。请稍后重试。';
    }
  }

  /**
   * 获取 embedding 维度
   */
  static getEmbeddingDimension(model: keyof typeof RAGServiceHF.HF_MODELS = 'best'): number {
    const dimensions: Record<keyof typeof RAGServiceHF.HF_MODELS, number> = {
      multilingual: 384,
      english: 384,
      best: 512,
      backup: 768,
    };
    return dimensions[model];
  }
}

