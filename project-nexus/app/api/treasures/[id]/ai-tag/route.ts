
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { generateAiTagsForTreasure } from '@/lib/ai/tagging';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id:string }> }
) {
  let treasureId = '';
  try {
    const { id } = await params;
    treasureId = id;
    const userId = await getUserId(request);

    console.info('[AI Tagging] start', { treasureId, userId });

    const treasure = await prisma.treasure.findUnique({
      where: {
        id: treasureId,
        userId: userId,
      },
      include: {
        images: true,
      },
    });

    if (!treasure) {
      console.warn('[AI Tagging] treasure not found', { treasureId, userId });
      return NextResponse.json({ error: 'Treasure not found or access denied' }, { status: 404 });
    }

    if (Array.isArray(treasure.aiTags) && treasure.aiTags.length > 0) {
      console.info('[AI Tagging] already tagged', { treasureId, count: treasure.aiTags.length });
      return NextResponse.json({ success: true, tags: treasure.aiTags, alreadyTagged: true });
    }
    
    const fallbackTags = ['#实体/未分类'];
    const applyFallback = async (reason: string) => {
      try {
        await prisma.treasure.update({
          where: { id: treasureId },
          data: { aiTags: fallbackTags },
        });
        console.warn('[AI Tagging] fallback applied', { treasureId, reason, tags: fallbackTags });
        return NextResponse.json({ success: true, tags: fallbackTags, fallback: true, reason });
      } catch (fallbackError) {
        console.error('[AI Tagging] fallback failed', { treasureId, error: fallbackError });
        return NextResponse.json({ error: 'Failed to apply AI tag fallback' }, { status: 500 });
      }
    };

    if (!treasure.content && treasure.images.length === 0) {
      console.warn('[AI Tagging] no content to tag', { treasureId });
      return applyFallback('no-content');
    }

    const aiTagPool = await prisma.treasure.findMany({
      where: { userId },
      select: { aiTags: true },
    });
    const existingAiTags = Array.from(
      new Set(aiTagPool.flatMap(item => item.aiTags ?? []))
    );

    // Fire and forget is implicitly handled by the client not waiting for this response.
    // The AI generation happens here.
    const aiTags = await generateAiTagsForTreasure(treasure, existingAiTags);

    console.info('[AI Tagging] generated', { treasureId, count: aiTags.length });

    if (aiTags.length > 0) {
      await prisma.treasure.update({
        where: {
          id: treasureId,
        },
        data: {
          aiTags: aiTags,
        },
      });
      return NextResponse.json({ success: true, tags: aiTags });
    }

    return applyFallback('empty-result');
  } catch (error) {
    console.error(`[AI Tagging Error]:`, error);
    if (treasureId) {
      try {
        const fallbackTags = ['#实体/未分类'];
        await prisma.treasure.update({
          where: { id: treasureId },
          data: { aiTags: fallbackTags },
        });
        console.warn('[AI Tagging] fallback applied after error', { treasureId, tags: fallbackTags });
        return NextResponse.json({ success: true, tags: fallbackTags, fallback: true, reason: 'error' });
      } catch (fallbackError) {
        console.error('[AI Tagging] fallback failed after error', { treasureId, error: fallbackError });
      }
    }
    return NextResponse.json({ error: 'Failed to generate AI tags' }, { status: 500 });
  }
}
