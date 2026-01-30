const https = require('https');
const http = require('http');

// --- Configuration ---
// 在这里填入你想监控的 UP 主 UID (必须是你已关注的)
// 示例: 
// 489667127 (机核 Gcores)
// 如果留空 [], 则不进行过滤，推送所有关注列表的更新
const TARGET_UIDS = [];

// Config from pipeline env
const NEXUS_API_URL = process.env.NEXUS_API_URL || 'http://localhost:3000/api/ingest';
const NEXUS_KEY = process.env.NEXUS_INGEST_KEY || 'dev-super-admin-2024';
const BILIBILI_SESSDATA = process.env.BILIBILI_SESSDATA || '';

// Helper for requests
function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    resolve({ code: -1, message: `HTTP ${res.statusCode}: ${data}` });
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

// Helper to push to Nexus
async function pushToNexus(items) {
    if (items.length === 0) return;

    // Transform to Nexus format
    const payload = items.map(item => {
        const dyn = item.modules?.module_dynamic;
        const major = dyn?.major;
        const archive = major?.archive;
        const author = item.modules?.module_author;

        if (!dyn || !author) return null;

        const title = archive?.title || dyn.desc?.text?.slice(0, 100) || 'Bilibili Dynamic';
        const content = dyn.desc?.text || title;

        let link = `https://t.bilibili.com/${item.id_str}`;
        if (archive?.jump_url) link = `https:${archive.jump_url}`;

        return {
            source: 'Bilibili', // Match RSS_FEEDS.name for easier filtering
            sourceType: 'culture',
            title: title,
            content: content,
            link: link,
            externalId: item.id_str,
            authorName: author.name,
            authorAvatar: author.face,
            publishedAt: new Date((author.pub_ts || Date.now() / 1000) * 1000).toISOString(),
            metadata: {
                cover: archive?.cover || '',
                views: archive?.stat?.play || 0,
                danmaku: archive?.stat?.danmaku || 0,
                sourceIcon: '📺'
            },
            tags: ['bilibili', author.name]
        };
    }).filter(i => i !== null);

    console.log(`Pushing ${payload.length} filtered items to Nexus...`);

    try {
        const urlObj = new URL(NEXUS_API_URL);
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NEXUS_KEY}`
            }
        };

        return new Promise((resolve, reject) => {
            const client = urlObj.protocol === 'https:' ? https : http;
            const req = client.request(urlObj, requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log('Success! Ingest Response:', data);
                        resolve();
                    } else {
                        console.error(`Ingest Failed: ${res.statusCode} ${data}`);
                        resolve();
                    }
                });
            });
            req.on('error', (e) => {
                console.error('Ingest Network Error:', e);
                resolve();
            });
            req.write(JSON.stringify(payload));
            req.end();
        });

    } catch (e) {
        console.error('Failed to prepare push:', e.message);
    }
}

async function main() {
    console.log('Starting Bilibili Monitor (Timeline Mode)...');

    // Headers mimic a normal browser visit to the homepage/dynamic feed
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': `SESSDATA=${BILIBILI_SESSDATA}`,
        'Referer': 'https://t.bilibili.com/',
        'Origin': 'https://t.bilibili.com'
    };

    try {
        // Fetch User's General Dynamic Feed (Video Only type=8, or remove type for all)
        const url = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all?type=video';
        console.log(`Fetching timeline feed...`);

        const raw = await fetch(url, { headers });

        if (raw.code !== 0) {
            console.error('Feed API Error:', raw.message || raw);
            return;
        }

        const allItems = raw.data?.items || [];
        console.log(`Fetched ${allItems.length} items from timeline.`);

        // Filter Logic
        let finalItems = allItems;
        if (TARGET_UIDS.length > 0) {
            console.log(`Filtering for ${TARGET_UIDS.length} target UIDs...`);
            finalItems = allItems.filter(item => {
                const mid = String(item.modules?.module_author?.mid);
                return TARGET_UIDS.includes(mid);
            });
        }

        if (finalItems.length > 0) {
            console.log(`\n--- Matched ${finalItems.length} items ---`);
            finalItems.forEach((item, i) => {
                const module = item.modules?.module_dynamic;
                const title = module?.major?.archive?.title || module?.desc?.text?.slice(0, 30).replace(/\n/g, ' ') || 'Untitled';
                const author = item.modules?.module_author?.name;
                console.log(`[${i + 1}] ${author}: ${title}`);
            });

            await pushToNexus(finalItems);
        } else {
            console.log('No updates from target UPs found in current timeline page.');
        }

    } catch (e) {
        console.error('Crawl failed:', e);
        process.exit(1);
    }
}

main();
