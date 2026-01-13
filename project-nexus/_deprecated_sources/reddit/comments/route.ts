import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 排序字段类型定义
type SortByField = 'score' | 'createdUtc' | 'depth';

// 排序字段映射（类型安全）
const SORT_FIELD_MAP: Record<SortByField, { [key: string]: 'asc' | 'desc' }> = {
  score: { score: 'desc' },
  createdUtc: { createdUtc: 'desc' },
  depth: { depth: 'asc' }
};

// 默认排序
const DEFAULT_SORT_BY: SortByField = 'score';

/**
 * GET /api/reddit/comments
 * 获取 Reddit 帖子的评论
 *
 * 查询参数:
 * - postId: Reddit 帖子的数据库 ID（必需）
 * - page: 分页页码，从 1 开始（可选，默认 1）
 * - limit: 每页数量（可选，默认 20，最大 100）
 * - sortBy: 排序字段 (score|createdUtc|depth)（可选，默认 score）
 *
 * 示例:
 * GET /api/reddit/comments?postId=abc123&page=1&limit=20&sortBy=score
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const sortByParam = (searchParams.get('sortBy') || DEFAULT_SORT_BY) as string;

    // 验证必需参数
    if (!postId || !postId.trim()) {
      return NextResponse.json(
        { error: '缺少必需参数: postId' },
        { status: 400 }
      );
    }

    // 验证排序字段（白名单）
    if (!Object.keys(SORT_FIELD_MAP).includes(sortByParam)) {
      return NextResponse.json(
        { 
          error: `无效的排序字段: ${sortByParam}`,
          validSortFields: Object.keys(SORT_FIELD_MAP)
        },
        { status: 400 }
      );
    }

    const sortBy = sortByParam as SortByField;
    const orderBy = SORT_FIELD_MAP[sortBy];
    const skip = (page - 1) * limit;

    // 合并查询：并行获取评论总数和评论数据（性能优化）
    const [total, comments] = await Promise.all([
      prisma.redditComment.count({
        where: { postId }
      }),
      prisma.redditComment.findMany({
        where: { postId },
        select: {
          id: true,
          author: true,
          body: true,
          score: true,
          createdUtc: true,
          parentId: true,
          depth: true,
          isSubmitter: true,
          permalink: true,
          scrapedAt: true
        },
        orderBy,
        skip,
        take: limit
      })
    ]);

    // 计算分页信息
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        postId,
        comments: comments.map((c: typeof comments[number]) => ({
          id: c.id,
          author: c.author,
          body: c.body,
          score: c.score,
          createdAt: c.createdUtc.toISOString(),
          depth: c.depth,
          isSubmitter: c.isSubmitter,
          permalink: c.permalink,
          scrapedAt: c.scrapedAt.toISOString()
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        },
        meta: {
          sortBy,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Reddit Comments API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取评论失败'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reddit/comments
 * 删除特定帖子的所有评论（管理员操作）
 *
 * 查询参数:
 * - postId: Reddit 帖子的数据库 ID（必需）
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    // 验证必需参数
    if (!postId || !postId.trim()) {
      return NextResponse.json(
        { error: '缺少必需参数: postId' },
        { status: 400 }
      );
    }

    // 先获取评论数（用于返回）
    const count = await prisma.redditComment.count({
      where: { postId }
    });

    if (count === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: '该帖子没有评论可删除'
      });
    }

    // 删除评论
    await prisma.redditComment.deleteMany({
      where: { postId }
    });

    return NextResponse.json({
      success: true,
      deleted: count,
      message: `成功删除 ${count} 条评论`
    });
  } catch (error) {
    console.error('Reddit Comments Delete Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '删除评论失败'
      },
      { status: 500 }
    );
  }
}
