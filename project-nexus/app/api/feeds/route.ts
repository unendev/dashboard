import { NextResponse } from 'next/server';
import { fetchAllFeeds } from '@/lib/rss';

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
    try {
        const [rssItems, biliResponse] = await Promise.all([
            fetchAllFeeds(),
            // Fetch/Compute Bilibili Feeds
            // Since we can't easily fetch our own API without a base URL in serverless,
            // we'll assume for now we might skip it or we need a robust way.
            // But wait, the user wants Bilibili integration.
            // Let's rely on the shared Bilibili logic we are about to create.
            import('@/lib/bilibili').then(mod => mod.fetchBilibiliFeeds()).catch(() => [])
        ]);

        const allItems = [...rssItems, ...biliResponse].sort((a, b) => {
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
