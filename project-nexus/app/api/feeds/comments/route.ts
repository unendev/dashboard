import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchRedditComments } from '@/lib/reddit';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
        return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    try {
        console.log(`[API] Fetching comments for postId: ${postId}`);
        
        // 1. Try to fetch from database first (if collected by scraper)
        const dbPostId = postId.startsWith('reddit_') ? postId : `reddit_${postId}`;
        
        // Try multiple ID formats to be safe
        const dbComments = await prisma.$queryRaw`
            SELECT comment_id as id, author, body, score, created_utc as created
            FROM reddit_comments
            WHERE post_id = ${dbPostId} 
               OR post_id = ${postId}
               OR reddit_post_id = ${postId.replace('reddit_', '')}
            ORDER BY score DESC
            LIMIT 50
        `;

        if (Array.isArray(dbComments) && dbComments.length > 0) {
            console.log(`[API] Found ${dbComments.length} comments in DB`);
            return NextResponse.json({ 
                success: true,
                comments: dbComments, 
                source: 'database' 
            });
        }

        // 2. Fallback to live API if not in DB
        const redditId = postId.includes('_') ? postId.split('_').pop() : postId;
        console.log(`[API] No DB comments found. Trying live API for redditId: ${redditId}`);
        
        const liveComments = await fetchRedditComments(redditId || '');
        
        return NextResponse.json({ 
            success: true,
            comments: liveComments, 
            source: 'live_api',
            note: 'Comments fetched live as they were missing from database.'
        });

    } catch (error) {
        console.error('[API] Failed to fetch comments:', error);
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
}
