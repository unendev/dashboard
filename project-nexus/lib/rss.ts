import { FeedItem, FeedConfig, RSS_FEEDS } from './rss-config';
import Parser from 'rss-parser';

export type { FeedItem, FeedConfig };
export { RSS_FEEDS };

// Helper to fetch with timeout and headers (Proxy aware)
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
    const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
    let agent = undefined;

    try {
        if (process.env.NODE_ENV !== 'production') {
            const { HttpsProxyAgent } = await import('https-proxy-agent');
            agent = new HttpsProxyAgent(proxyUrl);
        }
    } catch (e) { /* Ignore */ }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
        const response = await fetch(url, {
            ...options,
            // @ts-ignore
            agent: agent,
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...options.headers
            },
            next: { revalidate: 300 }
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// Helper to extract images from RSS items (Parser puts them in various places)
function extractImage(item: any): string {
    // 1. Enclosure
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) return item.enclosure.url;
    // 2. Media Content/Thumbnail (YouTube/Gcores)
    if (item['media:content']?.url) return item['media:content'].url;
    if (item['media:content']?.['$']?.url) return item['media:content']['$'].url;
    if (item['media:thumbnail']?.url) return item['media:thumbnail'].url;
    if (item['media:thumbnail']?.['$']?.url) return item['media:thumbnail']['$'].url;
    // 3. Custom fields like <thumb>
    if (item.thumb) return item.thumb;
    // 4. Fallback: regex on content (Parser doesn't scrape HTML)
    const content = item['content:encoded'] || item.content || item.summary || '';
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
    return imgMatch ? imgMatch[1] : '';
}

// RSS/Atom Parser using rss-parser lib
async function parseRSS(url: string): Promise<FeedItem[]> {
    if (!url) return [];

    // Configure parser with custom fields
    const parser = new Parser({
        customFields: {
            item: [
                ['media:content', 'media:content'],
                ['media:thumbnail', 'media:thumbnail'],
                ['thumb', 'thumb'],         // Gcores
                ['content:encoded', 'contentEncoded'],
            ]
        }
    });

    try {
        // 1. Fetch raw XML string using our proxy-aware fetcher
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();

        // 2. Parse string
        const feed = await parser.parseString(xml);

        // 3. Transform
        return feed.items.map(item => ({
            title: item.title || 'Untitled',
            link: item.link || '#',
            pubDate: item.pubDate || item.isoDate,
            isoDate: item.isoDate || new Date().toISOString(),
            content: item.contentEncoded || item.content || item.summary || '',
            contentSnippet: item.contentSnippet || (item.content || '').slice(0, 150),
            source: 'rss', // Will be overridden
            imageUrl: extractImage(item),
            categories: item.categories,
            author: item.creator || item.author
        }));
    } catch (err) {
        console.error(`RSS Parser Error for ${url}:`, err);
        return [];
    }
}

export async function fetchFeed(config: FeedConfig): Promise<FeedItem[]> {
    if (!config.enabled || config.isParent) return [];
    if (config.url === 'api_mode') return [];

    try {
        // Handle Reddit JSON API specially (RSS Handler is for XML)
        if (config.url.endsWith('.json')) {
            const res = await fetchWithTimeout(config.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
                    source: config.name,
                    sourceIcon: config.icon,
                    author: item.author,
                    categories: [item.subreddit]
                };
            });
        }

        // Standard RSS Flow
        const items = await parseRSS(config.url);
        return items.map(item => ({
            ...item,
            source: config.name,
            sourceIcon: config.icon
        }));

    } catch (error) {
        console.warn(`[RSS] Failed to fetch ${config.name}:`, error);
        return [];
    }
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
    const promises = RSS_FEEDS.map(config => fetchFeed(config));
    const results = await Promise.all(promises);
    const allItems = results.flat();
    return allItems.sort((a, b) => {
        const dateA = a.isoDate ? new Date(a.isoDate).getTime() : 0;
        const dateB = b.isoDate ? new Date(b.isoDate).getTime() : 0;
        return dateB - dateA;
    });
}
