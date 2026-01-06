import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth-utils';

/**
 * GET /api/post-tags?source=linuxdo&postId=xxx
 * 获取特定帖子的标签，或获取用户的所有标签
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const source = request.nextUrl.searchParams.get('source');
    const postId = request.nextUrl.searchParams.get('postId');
    
    if (postId && source) {
      // 获取特定帖子的标签
      const postTag = await prisma.postTag.findUnique({
        where: {
          userId_source_postId: {
            userId,
            source,
            postId
          }
        }
      });
      
      return NextResponse.json(postTag || { tags: [], category: null });
    }
    
    // 获取用户的所有标签（可选择按source过滤）
    const postTags = await prisma.postTag.findMany({
      where: {
        userId,
        source: source || undefined
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    return NextResponse.json(postTags);
  } catch (error) {
    console.error('Failed to get post tags:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/post-tags
 * 创建或更新帖子标签
 * Body: { source: string, postId: string, tags: string[], category?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const { source, postId, tags, category } = body;
    
    console.log('📥 [POST /api/post-tags] 收到请求', { 
      userId, 
      source, 
      postId, 
      tagsCount: tags?.length, 
      category 
    });
    
    // 参数验证
    if (!source || !postId) {
      console.warn('⚠️ [POST] 缺少必需参数', { source, postId });
      return NextResponse.json({ 
        error: 'Missing required parameters: source and postId' 
      }, { status: 400 });
    }
    
    if (!Array.isArray(tags)) {
      console.warn('⚠️ [POST] tags 必须是数组', { tagsType: typeof tags, tags });
      return NextResponse.json({ 
        error: 'Invalid parameter: tags must be an array' 
      }, { status: 400 });
    }
    
    // 如果标签为空且没有分类，则删除记录
    if (tags.length === 0 && !category) {
      console.log('🗑️ [POST] 标签为空，删除记录', { userId, source, postId });
      const result = await prisma.postTag.deleteMany({
        where: { userId, source, postId }
      });
      console.log('✅ [POST] 删除完成', { deletedCount: result.count });
      return NextResponse.json({ 
        success: true, 
        deleted: true, 
        count: result.count,
        message: '标签已全部删除'
      });
    }
    
    // 创建或更新标签
    console.log('💾 [POST] 执行 upsert', { userId, source, postId, tagsCount: tags.length });
    const postTag = await prisma.postTag.upsert({
      where: { userId_source_postId: { userId, source, postId } },
      update: { tags, category: category || null, updatedAt: new Date() },
      create: { userId, source, postId, tags, category: category || null }
    });
    console.log('✅ [POST] upsert 完成', { 
      id: postTag.id, 
      tagsCount: postTag.tags.length,
      updatedAt: postTag.updatedAt
    });
    
    return NextResponse.json({
      success: true,
      deleted: false,
      data: postTag,
      message: '标签保存成功'
    });
  } catch (error) {
    console.error('❌ [POST /api/post-tags] 异常:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: '保存标签失败，请稍后重试'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/post-tags?source=linuxdo&postId=xxx
 * 删除帖子标签
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const source = request.nextUrl.searchParams.get('source');
    const postId = request.nextUrl.searchParams.get('postId');
    
    if (!source || !postId) {
      return NextResponse.json({ error: 'Missing source or postId' }, { status: 400 });
    }
    
    await prisma.postTag.deleteMany({
      where: {
        userId,
        source,
        postId
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete post tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


