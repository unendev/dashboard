import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { RAGService } from '@/lib/rag-service';

// POST /api/treasures/search-rag - RAG 搜索
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    // 1. 获取用户的所有 treasures
    const treasures = await prisma.treasure.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        type: true,
      },
    });

    if (treasures.length === 0) {
      return NextResponse.json({
        treasures: [],
        answer: '你还没有创建任何宝藏，无法进行搜索。',
      });
    }

    // 2. 为每个 treasure 生成 embedding（实际应用中应该预先生成并缓存）
    // 注意：这里为了演示简化了流程，实际应该在创建 treasure 时就生成 embedding
    const treasuresWithEmbeddings = await Promise.all(
      treasures.map(async (treasure) => {
        const text = `${treasure.title}\n${treasure.content || ''}`;
        try {
          const embedding = await RAGService.generateEmbedding(text);
          return {
            id: treasure.id,
            embedding,
            text,
            metadata: {
              title: treasure.title,
              tags: treasure.tags,
              type: treasure.type,
            },
          };
        } catch (error) {
          console.error(`Error generating embedding for treasure ${treasure.id}:`, error);
          return null;
        }
      })
    );

    // 过滤掉失败的 embeddings
    const validTreasures = treasuresWithEmbeddings.filter((t): t is NonNullable<typeof t> => t !== null);

    if (validTreasures.length === 0) {
      return NextResponse.json({
        error: '无法生成 embeddings，请检查 API 配置',
      }, { status: 500 });
    }

    // 3. 执行 RAG 搜索
    const result = await RAGService.queryWithRAG(query, validTreasures);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in RAG search:', error);
    return NextResponse.json(
      { error: 'Failed to perform RAG search' },
      { status: 500 }
    );
  }
}

// GET /api/treasures/search-rag - 简单的相似度搜索（不生成答案）
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const topK = parseInt(searchParams.get('topK') || '5');

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    // 1. 获取用户的所有 treasures
    const treasures = await prisma.treasure.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        type: true,
      },
    });

    if (treasures.length === 0) {
      return NextResponse.json({ treasures: [] });
    }

    // 2. 生成 embeddings
    const treasuresWithEmbeddings = await Promise.all(
      treasures.map(async (treasure) => {
        const text = `${treasure.title}\n${treasure.content || ''}`;
        try {
          const embedding = await RAGService.generateEmbedding(text);
          return {
            id: treasure.id,
            embedding,
            text,
            metadata: {
              title: treasure.title,
              tags: treasure.tags,
              type: treasure.type,
            },
          };
        } catch (error) {
          console.error(`Error generating embedding for treasure ${treasure.id}:`, error);
          return null;
        }
      })
    );

    const validTreasures = treasuresWithEmbeddings.filter((t): t is NonNullable<typeof t> => t !== null);

    if (validTreasures.length === 0) {
      return NextResponse.json({
        error: '无法生成 embeddings，请检查 API 配置',
      }, { status: 500 });
    }

    // 3. 执行搜索
    const results = await RAGService.search(query, validTreasures, topK);

    return NextResponse.json({ treasures: results });
  } catch (error) {
    console.error('Error in similarity search:', error);
    return NextResponse.json(
      { error: 'Failed to perform similarity search' },
      { status: 500 }
    );
  }
}

