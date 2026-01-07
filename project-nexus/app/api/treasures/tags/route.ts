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

    // 1. 查找所有可能相关的宝藏 (包含 tag 或 tag/...)
    // 由于 Prisma 不支持数组元素的 startsWith 过滤，我们需要先查包含 exact tag 的，
    // 对于 child tags，可能需要更宽泛的搜索，或者为了性能，我们假设用户删除 folder 时是想删除该分类下的所有 tags。
    // 但实际上，findMany 很难直接查 "tags array contains element starting with X".
    // 权衡：先查所有宝藏（或者用户的所有宝藏），这可能太重了。
    // 优化：只查 exact match 用于单一删除？不，文件夹删除是必须的。
    // 妥协方案：遍历该用户的所有宝藏（如果数据量巨大需要优化，但当前阶段可行）。
    // 或者：只支持精确删除，前端 UI 必须递归调用？前端也很难获得所有子标签列表如果没有展开。

    // 更好的方案：Postgres 数组支持，但这里是 Prisma 通用层。
    // 让我们先获取该用户的所有 tags (我们可以重用 GET 逻辑)，找到所有匹配的 tag names。
    const allTreasures = await prisma.treasure.findMany({
      where: { userId },
      select: { id: true, tags: true }
    });

    // 2. 筛选出受影响的宝藏和需要移除的标签
    const targetPrefix = tag + '/';
    let updatedCount = 0;

    for (const t of allTreasures) {
      const originalLength = t.tags.length;
      // 移除 精确匹配 OR 是子标签
      const newTags = t.tags.filter(tg => tg !== tag && !tg.startsWith(targetPrefix));

      if (newTags.length !== originalLength) {
        await prisma.treasure.update({
          where: { id: t.id },
          data: { tags: newTags }
        });
        updatedCount++;
      }
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
