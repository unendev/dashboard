const https = require('https');

const SESSDATA = '88f5f6a1%2C1783503522%2Cf92a0%2A11CjBN9CBsEKVExIY_ttVV6QHtBd43OIuct_5WGVQbev1YBusAWWFy17NAJ14PkkgbpT8SVjVZYzMxYmJrZ3lyZGFoaHNOY2ZpdTdsS0NtblFYRE1vTGlqZndXeDdMald4Y3hmeTdPNzltb0VUWFZMVDl0blh1ZjFxZkJLZ0FnamZYWXBUbHUxcW9nIIEC';
const UID = 346575605; // Kate人不错

const options = {
  hostname: 'api.bilibili.com',
  path: `/x/space/arc/search?mid=${UID}&ps=5&tid=0&pn=1&keyword=&order=pubdate`,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': `https://space.bilibili.com/${UID}/video`,
    'Cookie': `SESSDATA=${SESSDATA}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('Response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Raw Data:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.end();
