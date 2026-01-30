const https = require('https');

const url = 'https://api.xiaoheihe.cn/v3/bbs/app/api/web/news/get_list?limit=10&offset=0&version=999.0.0';

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            console.log(`Status: ${res.statusCode}`);
            const json = JSON.parse(data);
            console.log('Result Success:', !!json.result);
            if (json.result && json.result.links) {
                console.log('Sample Items:', json.result.links.length);
                console.log('First Item:', json.result.links[0].title);
            } else {
                console.log('Unexpected Structure:', Object.keys(json));
            }
        } catch (e) {
            console.log('Parse Error:', e.message);
            console.log('Raw Data:', data.slice(0, 100));
        }
    });
}).on('error', (e) => {
    console.error('Network Error:', e);
});
