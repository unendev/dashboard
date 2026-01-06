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

    // 2. 类型筛选
    if (type && ['TEXT', 'IMAGE'].includes(type)) {
      where.type = type as any;
    }

    // 3. 搜索关键词
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
    const { images, tags, theme, ...rest } = validated;
    const normalizedTags = Array.isArray(tags) ? [...tags] : [];

    if (normalizedTags.length === 0) {
      const themeTags = Array.isArray(theme) ? theme : theme ? [theme] : [];
      const fallbackTags = themeTags
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1));
      normalizedTags.push(...(fallbackTags.length > 0 ? fallbackTags : ['未分类']));
      console.warn('[Treasure Create] tags empty, fallback applied', {
        userId,
        tags: normalizedTags
      });
    }
    const treasure = await prisma.treasure.create({
      data: {
        userId,
        ...rest,
        tags: normalizedTags,
        theme,
        images: { create: images }
      }
    });
    invalidateUserTagCache(userId);
    return NextResponse.json(treasure, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
