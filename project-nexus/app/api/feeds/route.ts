import { NextResponse } from 'next/server';
import { fetchAllFeeds } from '@/lib/rss';
import { fetchBilibiliFeeds } from '@/lib/bilibili';
import { prisma } from '@/lib/prisma';

export const revalidate = 60; // Cache for 1 minute

export async function GET() {
    try {
        const [rssItems, biliItems, dbItems] = await Promise.all([
            fetchAllFeeds(),
            fetchBilibiliFeeds(),
            prisma.nexusItem.findMany({
                orderBy: { publishedAt: 'desc' },
                take: 50 // Limit specific DB items to most recent 50
            })
        ]);

        // Convert Database items to standard FeedItem format
        const dbFeedItems = dbItems.map(item => ({
            id: item.id,
            title: item.title || 'No Title',
            link: item.link || '#',
            pubDate: item.publishedAt.toUTCString(),
            isoDate: item.publishedAt.toISOString(),
            content: item.content || '',
            contentSnippet: item.summary || item.content?.slice(0, 200) || '',
            // Try to extract image from metadata or content
            imageUrl: (item.metadata as any)?.images?.[0] || (item.metadata as any)?.image || '',
            source: item.source,
            sourceIcon: (item.metadata as any)?.sourceIcon || '📡',
            categories: item.tags,
            author: item.authorName,
            summary: item.summary || undefined,
            metadata: item.metadata
        }));

        const allItems = [...rssItems, ...biliItems, ...dbFeedItems].sort((a, b) => {
            const dateA = a.isoDate ? new Date(a.isoDate).getTime() : 0;
            const dateB = b.isoDate ? new Date(b.isoDate).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({
            success: true,
            count: allItems.length,
            items: allItems
        });
    } catch (error) {
        console.error('Feed Aggregation Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch feeds' },
            { status: 500 }
        );
    }
}
