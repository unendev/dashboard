import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { suggestHumanTagsForTreasure } from '@/lib/ai/tagging';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const title = String(body?.title || '').trim() || '未命名';
    const content = typeof body?.content === 'string' ? body.content : '';

    if (!title && !content) {
      return NextResponse.json({ error: '内容为空' }, { status: 400 });
    }

    const treasures = await prisma.treasure.findMany({
      where: { userId },
      select: { tags: true },
    });

    const allTags = treasures.flatMap(t => t.tags || []);
    const domainPool = Array.from(new Set(allTags.filter(tag => tag.startsWith('#领域/'))));
    const conceptPool = Array.from(new Set(allTags.filter(tag => tag.startsWith('#概念/'))));

    const suggestions = await suggestHumanTagsForTreasure(
      { title, content: content || null },
      { domain: domainPool, concept: conceptPool },
      body.tags || [] // Pass tags
    );

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error suggesting tags:', error);
    return NextResponse.json({ error: 'AI Error' }, { status: 500 });
  }
}
