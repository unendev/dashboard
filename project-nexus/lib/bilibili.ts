import fs from 'fs';
import path from 'path';
import { FeedItem } from './rss';

interface BiliUser {
    uid: number;
    name: string;
    enabled: boolean;
    avatar?: string;
    description?: string;
}

interface BiliVideoResponse {
    code: number;
    message: string;
    data: {
        list: {
            vlist: {
                bvid: string;
                title: string;
                description: string;
                pic: string;
                author: string;
                created: number; // timestamp
                length: string; // duration "MM:SS"
            }[];
        };
    };
}

// Read config
function getBiliUsers(): BiliUser[] {
    try {
        const configPath = path.join(process.cwd(), 'config', 'bili-users.json');
        if (!fs.existsSync(configPath)) return [];
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        return config.filter((user: BiliUser) => user.enabled);
    } catch (error) {
        console.error('Failed to read bili-users config:', error);
        return [];
    }
}

export async function getBiliUserVideos(users: BiliUser[]): Promise<FeedItem[]> {
    const activeUsers = users.filter(u => u.enabled);
    const allVideos: FeedItem[] = [];

    // Fetch in sequence to avoid -799 rate limit (concurrent requests trigger it easily)
    for (const user of activeUsers) {
        try {
            // Add significant jitter delay (Bilibili is strict)
            await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));

            // Using standard Bilibili API
            const apiUrl = `https://api.bilibili.com/x/space/arc/search?mid=${user.uid}&ps=5&tid=0&pn=1&keyword=&order=pubdate`;

            // Remove proxy for Bilibili - Direct connection is usually better/whitelisted for API
            // unless IP is blacklisted.
            const agent = undefined;

            const headers: Record<string, string> = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': `https://space.bilibili.com/${user.uid}/video`,
                'Origin': 'https://space.bilibili.com'
            };

            // Inject SESSDATA if available
            if (process.env.BILIBILI_SESSDATA) {
                headers['Cookie'] = `SESSDATA=${process.env.BILIBILI_SESSDATA}`;
            }

            const res = await fetch(apiUrl, {
                headers,
                // @ts-ignore
                agent: agent,
                next: { revalidate: 300 }
            });

            if (!res.ok) {
                console.error(`Bilibili API Error ${res.status} for user ${user.name}`);
                continue;
            }

            const json = await res.json() as BiliVideoResponse;

            if (json.code !== 0 || !json.data?.list?.vlist) {
                console.warn(`Bilibili API returned code ${json.code} for user ${user.name}:`, json.message);
                continue;
            }

            const items = json.data.list.vlist.map(v => ({
                id: v.bvid,
                title: v.title,
                link: `https://www.bilibili.com/video/${v.bvid}`,
                pubDate: new Date(v.created * 1000).toUTCString(),
                isoDate: new Date(v.created * 1000).toISOString(),
                content: v.description || 'No description',
                contentSnippet: v.description,
                imageUrl: v.pic.startsWith('//') ? `https:${v.pic}` : v.pic,
                source: `Bilibili - ${user.name}`,
                sourceIcon: '📺',
                author: user.name,
                categories: ['Video']
            }));
            allVideos.push(...items);

        } catch (error) {
            console.error(`Failed to fetch Bilibili videos for ${user.name}:`, error);
        }
    }

    return allVideos;
}

export async function fetchBilibiliFeeds(): Promise<FeedItem[]> {
    const users = getBiliUsers();
    if (users.length === 0) return [];

    const allVideos = await getBiliUserVideos(users);
    return allVideos;
}
