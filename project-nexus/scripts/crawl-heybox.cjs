const https = require('https');
const http = require('http');

/**
 * Nexus Crawler - Heybox (Xiaoheihe) - Page Scraper Mode
 * Strategy: Fetch homepage HTML and regex scan for data, passing it to Nexus.
 */

// --- Configuration ---
const NEXUS_API_URL = process.env.NEXUS_API_URL || 'http://localhost:10000/api/ingest';
const NEXUS_KEY = process.env.NEXUS_INGEST_KEY || 'dev-super-admin-2024';
const HEYBOX_COOKIE = process.env.HEYBOX_COOKIE || '';

async function main() {
    console.log('🎮 Starting Heybox Crawler (Web Scraper Mode)...');

    // Fallback Strategy: Fetch the Web Page directly (SSR Data)
    const url = 'https://www.xiaoheihe.cn/home';
    console.log(`Target URL: ${url}`);

    try {
        const rawHtml = await fetchUrl(url, HEYBOX_COOKIE);
        console.log(`Fetched HTML (Length: ${rawHtml.length})`);

        // Extract Links via Regex
        const items = extractItemsFromHtml(rawHtml);
        console.log(`Scanned ${items.length} potential items.`);

        // Filter valid ones
        const validItems = items.filter(i => i.title && i.linkid && i.title.length > 2);
        console.log(`Filtered to ${validItems.length} valid items.`);

        if (validItems.length > 0) {
            const nexusItems = validItems.map(transformItem);
            await pushToNexus(nexusItems);
        } else {
            console.log('No items found. Cookie might be invalid or page structure changed.');
            // Dump snippet for debug
            console.log('HTML Snippet:', rawHtml.slice(0, 500));
        }

    } catch (e) {
        console.error('Fatal Error:', e);
    }
}

function fetchUrl(url, cookie) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': cookie
            }
        };

        https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Web Page Error: ${res.statusCode}`));
                return;
            }
            let html = '';
            res.on('data', chunk => html += chunk);
            res.on('end', () => resolve(html));
        }).on('error', reject);
    });
}

function extractItemsFromHtml(html) {
    const extracted = [];
    const seen = new Set();

    // Pattern: "linkid":"123" ... "title":"..."
    // We try to catch JSON objects inside scripts
    const newerRegex = /"linkid":"(\d+)"[^}]*?"title":"(.*?)"/g;

    let match;
    while ((match = newerRegex.exec(html)) !== null) {
        const linkId = match[1];
        if (!seen.has(linkId)) {
            seen.add(linkId);
            let titleRaw = match[2];

            // Fix unicode escapes manually just in case
            try {
                titleRaw = JSON.parse(`"${titleRaw}"`);
            } catch (e) { }

            extracted.push({
                linkid: linkId,
                title: titleRaw,
                description: ''
            });
        }
    }
    return extracted;
}

function transformItem(item) {
    const link = `https://www.xiaoheihe.cn/app/bbs/link/${item.linkid}`;
    return {
        source: 'Heybox',
        sourceType: 'culture',
        title: item.title,
        content: item.title, // Use title for now
        summary: '', // Let AI generate it if it wants, or leave empty
        link: link,
        externalId: String(item.linkid),
        authorName: 'Heybox',
        publishedAt: new Date().toISOString(),
        tags: ['Heybox']
    };
}

function pushToNexus(items) {
    return new Promise((resolve, reject) => {
        console.log(`Pushing ${items.length} items to Nexus...`);
        const parsedUrl = new URL(NEXUS_API_URL);

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NEXUS_KEY}`
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`Ingest Response: ${body}`);
                resolve();
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(items));
        req.end();
    });
}

main();
