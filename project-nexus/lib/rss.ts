import { FeedItem, FeedConfig, RSS_FEEDS } from './rss-config';
export type { FeedItem, FeedConfig };
export { RSS_FEEDS };

// Simple regex-based RSS parser (Zero Dependency)
async function parseRSS(url: string): Promise<FeedItem[]> {
    if (!url) return []; // Handle virtual parents
    try {
        // Try to use a local proxy if available (for dev environment)
        // Hardcoded generic proxy for local dev (Clash/v2ray default)
        const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
        let agent = undefined;

        try {
            // Dynamic import to avoid build crashes if missing
            const { HttpsProxyAgent } = await import('https-proxy-agent');
            agent = new HttpsProxyAgent(proxyUrl);
        } catch (e) {
            // Ignore if agent cannot be loaded
        }

        const res = await fetch(url, {
            // @ts-ignore - node-fetch supports agent, native fetch might vary but Next.js polyfills often support it or we need undici.
            // Actually Next.js 13+ uses native fetch which extends undici. Undici supports 'dispatcher'.
            // But let's try standard 'agent' property first which many polyfills respect, or 'dispatcher' for undici.
            agent: agent,
            headers: {
                // Reddit requires a specific User-Agent format: <platform>:<app ID>:<version string> (by /u/<reddit username>)
                // Only specific UA for Reddit, generic for others to avoid tracking blocking
                'User-Agent': url.includes('reddit.com')
                    ? 'web:nexus-dashboard:v1.0.0 (by /u/dev)'
                    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/json',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            next: { revalidate: 300 }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Handle JSON (Reddit)
        if (url.endsWith('.json')) {
            const data = await res.json();
            if (!data.data?.children) return [];

            return data.data.children.map((child: any) => {
                const item = child.data;
                const hasImage = item.thumbnail && item.thumbnail.startsWith('http');
                const hasPreview = item.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&');

                return {
                    title: item.title,
                    link: `https://www.reddit.com${item.permalink}`,
                    pubDate: new Date(item.created_utc * 1000).toUTCString(),
                    isoDate: new Date(item.created_utc * 1000).toISOString(),
                    content: item.selftext || item.title,
                    contentSnippet: item.selftext ? item.selftext.slice(0, 150) : item.title,
                    imageUrl: hasPreview || (hasImage ? item.thumbnail : ''),
                    source: '', // Filled by fetchFeed
                    categories: [item.subreddit]
                } as FeedItem;
            });
        }

        // Handle XML (Standard RSS)
        const xml = await res.text();

        const items: FeedItem[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xml)) !== null) {
            const itemContent = match[1];

            const getTag = (tag: string) => {
                const regex = new RegExp(`<${tag}.*?>([\\s\\S]*?)<\\/${tag}>`, 'i');
                const m = itemContent.match(regex);
                return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
            };

            const title = getTag('title');
            const link = getTag('link');
            const pubDate = getTag('pubDate');
            const content = getTag('description') || getTag('content:encoded');
            const category = getTag('category');

            // Image Extraction Strategy
            let imageUrl = '';

            // 1. Try <thumb> (Gcores specific)
            const thumb = getTag('thumb');
            if (thumb) imageUrl = thumb;

            // 2. Try <media:content> or <media:thumbnail>
            if (!imageUrl) {
                const mediaRegex = /<media:(?:content|thumbnail)[^>]+url="([^"]+)"/i;
                const mediaMatch = itemContent.match(mediaRegex);
                if (mediaMatch) imageUrl = mediaMatch[1];
            }

            // 3. Try <enclosure>
            if (!imageUrl) {
                const enclosureRegex = /<enclosure[^>]+url="([^"]+)"[^>]*type="image/i;
                const enclosureMatch = itemContent.match(enclosureRegex);
                if (enclosureMatch) imageUrl = enclosureMatch[1];
            }

            // 4. Fallback: Try regex on content (img src)
            if (!imageUrl && content) {
                const imgRegex = /<img[^>]+src="([^">]+)"/i;
                const imgMatch = content.match(imgRegex);
                if (imgMatch) imageUrl = imgMatch[1];
            }

            if (title && link) {
                items.push({
                    title,
                    link,
                    pubDate,
                    isoDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                    content,
                    contentSnippet: content.replace(/<[^>]+>/g, '').slice(0, 150),
                    imageUrl,
                    source: '',
                    categories: category ? [category] : []
                });
            }
        }
        return items;
    } catch (error) {
        console.error(`Error parsing RSS from ${url}:`, error);
        return [];
    }
}

export async function fetchFeed(config: FeedConfig): Promise<FeedItem[]> {
    if (!config.enabled || config.isParent) return []; // Skip parents

    try {
        const items = await parseRSS(config.url);
        return items.map(item => ({
            ...item,
            source: config.name, // Use the child name (e.g., "Game Dev") or combine like "Reddit - Game Dev"
            sourceIcon: config.icon
        }));
    } catch (error) {
        console.warn(`[RSS] Failed to fetch ${config.name}:`, error);
        return [];
    }
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
    const promises = RSS_FEEDS.map(config => {
        if (config.url === 'api_mode') return Promise.resolve([]); // API based sources are handled separately
        return fetchFeed(config);
    });

    // We will let the API route handle the merging of Bilibili data
    // because `lib/rss.ts` shouldn't depend on Next.js API route implementation details

    const results = await Promise.all(promises);
    const allItems = results.flat();
    return allItems.sort((a, b) => {
        const dateA = a.isoDate ? new Date(a.isoDate).getTime() : 0;
        const dateB = b.isoDate ? new Date(b.isoDate).getTime() : 0;
        return dateB - dateA;
    });
}
