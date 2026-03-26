import { NextResponse } from 'next/server';
import { fetchAllFeeds } from '@/lib/rss';
import { prisma } from '@/lib/prisma';

export const revalidate = 60; // Cache for 1 minute

export async function GET() {
    try {
        const [rssItems, nexusItems, redditItems, heyboxItems] = await Promise.all([
            // Filter out reddit and heybox from RSS fetch to avoid slow network calls
            fetchAllFeeds().then(items => items.filter(item => 
                !item.source.toLowerCase().includes('reddit') && 
                !item.source.toLowerCase().includes('heybox')
            )),
            prisma.nexusItem.findMany({
                orderBy: { publishedAt: 'desc' },
                take: 50
            }),
            prisma.reddit_posts.findMany({
                orderBy: { timestamp: 'desc' },
                take: 30
            }),
            prisma.heybox_posts.findMany({
                orderBy: { timestamp: 'desc' },
                take: 30
            })
        ]);

        // Convert NexusItem
        const nexusFeedItems = nexusItems.map(item => ({
            id: item.id,
            title: item.title || 'No Title',
            link: item.link || '#',
            pubDate: item.publishedAt.toUTCString(),
            isoDate: item.publishedAt.toISOString(),
            content: item.content || '',
            contentSnippet: item.summary || item.content?.slice(0, 200) || '',
            imageUrl: (item.metadata as any)?.images?.[0] || (item.metadata as any)?.image || '',
            source: item.source,
            sourceIcon: (item.metadata as any)?.sourceIcon || '📡',
            categories: item.tags,
            author: item.authorName,
            summary: item.summary || undefined,
            metadata: item.metadata
        }));

        // Convert reddit_posts
        const redditFeedItems = redditItems.map(item => ({
            id: item.id,
            title: item.title_cn || item.title,
            link: item.url,
            pubDate: item.timestamp?.toUTCString() || new Date().toUTCString(),
            isoDate: item.timestamp?.toISOString() || new Date().toISOString(),
            content: item.detailed_analysis || item.title,
            contentSnippet: item.core_issue || item.title,
            imageUrl: (item.key_info as any)?.[0] || '', // Fallback or logic
            source: `Reddit - r/${item.subreddit || 'all'}`,
            sourceIcon: '🔴',
            categories: item.post_type ? [item.post_type] : [],
            author: 'Reddit Scraper',
            summary: item.detailed_analysis || undefined,
            metadata: {
                score: item.score,
                num_comments: item.num_comments,
                core_issue: item.core_issue,
                key_info: item.key_info,
                value_assessment: item.value_assessment,
                source: 'reddit_posts_table'
            }
        }));

        // Convert heybox_posts
        const heyboxFeedItems = heyboxItems.map(item => ({
            id: item.id,
            title: item.title_cn || item.title,
            link: item.url,
            pubDate: item.timestamp?.toUTCString() || new Date().toUTCString(),
            isoDate: item.timestamp?.toISOString() || new Date().toISOString(),
            content: item.detailed_analysis || item.content_summary || '',
            contentSnippet: item.core_issue || item.content_summary?.slice(0, 150) || '',
            imageUrl: item.cover_image || '',
            source: '小黑盒 Heybox',
            sourceIcon: '📦',
            categories: item.post_type ? [item.post_type] : (item.game_tag ? [item.game_tag] : []),
            author: item.author || 'Heybox Scraper',
            summary: item.detailed_analysis || undefined,
            metadata: {
                likes: item.likes_count,
                comments: item.comments_count,
                core_issue: item.core_issue,
                key_info: item.key_info,
                value_assessment: item.value_assessment,
                source: 'heybox_posts_table'
            }
        }));

        const allItems = [
            ...rssItems, 
            ...nexusFeedItems, 
            ...redditFeedItems, 
            ...heyboxFeedItems
        ].sort((a, b) => {
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
