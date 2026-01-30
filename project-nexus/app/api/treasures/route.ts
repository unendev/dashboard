import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../lib/auth-utils';
import { generateSignedUrl, extractOssKey } from '../../../lib/oss-utils';
import { prisma } from '@/lib/prisma';
import { createTreasureSchema } from '@/lib/validations/treasure';
import { ZodError } from 'zod';
import { findMatchingTags, invalidateUserTagCache } from '@/lib/tag-cache';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tag = searchParams.get('tag');
    const mode = searchParams.get('mode');
    const statsOnly = searchParams.get('statsOnly') === 'true';

    // Special Mode for Quantum Finder: All items, Full Content, Unpaginated
    if (mode === 'finder') {
      const finderData = await prisma.treasure.findMany({
        where: { userId },
        include: { images: true }, // Include images
        orderBy: { createdAt: 'desc' }
      });

      // Process images just like standard return
      const processedData = finderData.map(t => ({
        ...t,
        images: t.images.map(img => ({
          ...img,
          url: `/api/image-proxy?key=${encodeURIComponent(extractOssKey(img.url))}`
        }))
      }));

      return NextResponse.json({ treasures: processedData, count: processedData.length });
    }

    if (statsOnly) {
      const statsData = await prisma.treasure.findMany({
        where: { userId },
        select: {
          id: true,
          title: true, // 补全标题
          type: true,  // 补全类型
          createdAt: true,
          tags: true,
          theme: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ treasures: statsData, count: statsData.length });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const theme = searchParams.get('theme');  // 新增：主题参数

    const where: Prisma.TreasureWhereInput = { userId };

    // 1. 标签筛选逻辑
    if (tag) {
      const matchingTags = await findMatchingTags(tag, userId);
      if (matchingTags.length > 0) {
        where.tags = { hasSome: matchingTags };
      } else {
        where.tags = { has: tag };
      }
    }

    // 2. 主题筛选（新增）
    if (theme) {
      where.theme = { has: theme };
    }

    // 3. 类型筛选
    if (type && ['TEXT', 'IMAGE'].includes(type)) {
      where.type = type as any;
    }

    // 4. 搜索关键词
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const treasures = await prisma.treasure.findMany({
      where,
      include: { images: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return NextResponse.json(treasures.map(t => ({
      ...t,
      images: t.images.map(img => ({
        ...img,
        url: `/api/image-proxy?key=${encodeURIComponent(extractOssKey(img.url))}`
      }))
    })));
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const validated = createTreasureSchema.parse(body);
    const { images, tags, theme, auxiliaryContext, ...rest } = validated;
    console.log('[Treasure API] Received Create Request. Context:', auxiliaryContext); // Log Context
    const normalizedTags = Array.isArray(tags) ? [...tags] : [];

    if (normalizedTags.length === 0) {
      const themeTags = Array.isArray(theme) ? theme : theme ? [theme] : [];
      const fallbackTags = themeTags
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1));
      normalizedTags.push(...(fallbackTags.length > 0 ? fallbackTags : ['未分类']));
    }

    const treasure = await prisma.treasure.create({
      data: {
        userId,
        ...rest,
        tags: normalizedTags,
        theme: Array.isArray(theme) ? theme : theme ? [theme] : [],
        images: { create: images }
      }
    });

    // Sync AI Tagging (Ensures reliability even if user closes browser)
    try {
      // Find existing AI tags for context
      const aiTagPool = await prisma.treasure.findMany({
        where: { userId },
        select: { aiTags: true },
        take: 10, // Limit context size (Save Tokens)
        orderBy: { createdAt: 'desc' }
      });
      const existingAiTags = Array.from(new Set(aiTagPool.flatMap(item => item.aiTags ?? [])));

      // Import dynamically to avoid circular deps if any (though here it's fine)
      const { generateAiTagsForTreasure } = await import('@/lib/ai/tagging');

      const aiTags = await generateAiTagsForTreasure(
        {
          title: treasure.title,
          content: treasure.content,
          tags: treasure.tags
        },
        existingAiTags,
        treasure.tags,
        auxiliaryContext as string | undefined
      );

      console.log('[Treasure API] AI Tags Generated:', aiTags);

      if (aiTags.length > 0) {
        await prisma.treasure.update({
          where: { id: treasure.id },
          data: { aiTags }
        });
      }
    } catch (error) {
      console.error('[Treasure Create] Auto-tagging failed:', error);
      // We don't fail the request, just log errors
    }

    invalidateUserTagCache(userId);
    return NextResponse.json(treasure, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
