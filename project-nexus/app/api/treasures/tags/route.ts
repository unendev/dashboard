import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../../lib/auth-utils';
import { prisma } from '@/lib/prisma';

// GET /api/treasures/tags - 获取用户的所有标签
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);

    // 获取用户所有宝藏的标签
    const treasures = await prisma.treasure.findMany({
      where: { userId },
      select: { tags: true }
    });

    // 统计标签使用次数
    const tagCounts: Record<string, number> = {};
    treasures.forEach((treasure: typeof treasures[number]) => {
      treasure.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // 转换为数组并按使用次数排序
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// DELETE /api/treasures/tags - 批量删除标签
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const { tag } = body;

    if (!tag) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }

    // 1. 查找所有包含该标签的宝藏
    const treasures = await prisma.treasure.findMany({
      where: {
        userId,
        tags: { has: tag }
      },
      select: { id: true, tags: true }
    });

    // 2. 更新每个宝藏，移除标签
    // 注意：Prisma 不支持直接从数组移除元素的原子操作，需要读取-更新-写入
    let updatedCount = 0;
    for (const t of treasures) {
      const newTags = t.tags.filter(tg => tg !== tag);
      await prisma.treasure.update({
        where: { id: t.id },
        data: { tags: newTags }
      });
      updatedCount++;
    }

    return NextResponse.json({ count: updatedCount });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}

// PUT /api/treasures/tags - 批量重命名标签
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const { oldTag, newTag } = body;

    if (!oldTag || !newTag) {
      return NextResponse.json({ error: 'oldTag and newTag are required' }, { status: 400 });
    }

    // 1. 查找所有包含旧标签的宝藏
    const treasures = await prisma.treasure.findMany({
      where: {
        userId,
        tags: { has: oldTag }
      },
      select: { id: true, tags: true }
    });

    // 2. 更新每个宝藏
    let updatedCount = 0;
    for (const t of treasures) {
      // 移除旧标签
      let newTagsList = t.tags.filter(tg => tg !== oldTag);
      // 添加新标签（避免重复）
      if (!newTagsList.includes(newTag)) {
        newTagsList.push(newTag);
      }
      
      await prisma.treasure.update({
        where: { id: t.id },
        data: { tags: newTagsList }
      });
      updatedCount++;
    }

    return NextResponse.json({ count: updatedCount });
  } catch (error) {
    console.error('Error renaming tag:', error);
    return NextResponse.json({ error: 'Failed to rename tag' }, { status: 500 });
  }
}
