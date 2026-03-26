import nodeFetch from 'node-fetch';
import { env } from './env';
import { FeedItem } from './rss-config';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getRedditAccessToken() {
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    const clientId = env.REDDIT_CLIENT_ID;
    const clientSecret = env.REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Reddit Client ID or Secret missing');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Proxy support (reusing lib/rss logic)
    const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:7897';
    let agent = undefined;
    try {
        if (process.env.NODE_ENV !== 'production') {
            const { HttpsProxyAgent } = await import('https-proxy-agent');
            agent = new HttpsProxyAgent(proxyUrl);
        }
    } catch (e) { /* Ignore */ }

    const res = await nodeFetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'User-Agent': 'NexusDashboard/0.1 by unendev',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials',
        agent: agent
    } as any);

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Reddit Auth Failed: ${res.status} - ${text}`);
    }

    const data = await res.json() as any;
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
    return accessToken;
}

export async function fetchRedditSubreddit(subreddit: string, limit = 10): Promise<FeedItem[]> {
    try {
        const token = await getRedditAccessToken();
        const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:7897';
        let agent = undefined;
        try {
            if (process.env.NODE_ENV !== 'production') {
                const { HttpsProxyAgent } = await import('https-proxy-agent');
                agent = new HttpsProxyAgent(proxyUrl);
            }
        } catch (e) { /* Ignore */ }

        const res = await nodeFetch(`https://oauth.reddit.com/r/${subreddit}/hot?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'NexusDashboard/0.1 by unendev'
            },
            agent: agent
        } as any);

        if (!res.ok) throw new Error(`Reddit API Error: ${res.status}`);

        const data = await res.json() as any;
        if (!data.data?.children) return [];

        return data.data.children.map((child: any) => {
            const item = child.data;
            const hasImage = item.thumbnail && item.thumbnail.startsWith('http');
            const hasPreview = item.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&');

            return {
                id: item.id,
                title: item.title,
                link: `https://www.reddit.com${item.permalink}`,
                pubDate: new Date(item.created_utc * 1000).toUTCString(),
                isoDate: new Date(item.created_utc * 1000).toISOString(),
                content: item.selftext || item.title,
                contentSnippet: item.selftext ? item.selftext.slice(0, 300) : item.title,
                imageUrl: hasPreview || (hasImage ? item.thumbnail : ''),
                source: `Reddit - r/${subreddit}`,
                sourceIcon: '🔴',
                author: item.author,
                categories: [item.subreddit],
                metadata: {
                    score: item.score,
                    num_comments: item.num_comments,
                    subreddit: item.subreddit,
                    thumbnail: item.thumbnail
                }
            };
        });
    } catch (error) {
        console.error(`Failed to fetch Reddit r/${subreddit}:`, error);
        return [];
    }
}

export async function fetchRedditComments(postId: string): Promise<any[]> {
    try {
        const token = await getRedditAccessToken();
        const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:7897';
        let agent = undefined;
        try {
            if (process.env.NODE_ENV !== 'production') {
                const { HttpsProxyAgent } = await import('https-proxy-agent');
                agent = new HttpsProxyAgent(proxyUrl);
            }
        } catch (e) { /* Ignore */ }

        const res = await nodeFetch(`https://oauth.reddit.com/comments/${postId}?limit=10&depth=1`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'NexusDashboard/0.1 by unendev'
            },
            agent: agent
        } as any);

        if (!res.ok) throw new Error(`Reddit Comments API Error: ${res.status}`);

        const data = await res.json() as any;
        // Reddit returns an array [post, comments]
        const comments = data[1]?.data?.children || [];
        
        return comments.map((c: any) => ({
            id: c.data.id,
            author: c.data.author,
            body: c.data.body,
            score: c.data.score,
            created: c.data.created_utc
        }));
    } catch (error) {
        console.error(`Failed to fetch Reddit comments for ${postId}:`, error);
        return [];
    }
}
