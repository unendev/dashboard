// 直接测试 DeepSeek API 连接
import https from 'https';
import fs from 'fs';

// 从 .env 文件读取 API 密钥
const envContent = fs.readFileSync('.env', 'utf8');
const deepseekApiKey = envContent.match(/DEEPSEEK_API_KEY=(.+)/)?.[1]?.trim();

console.log('🔍 测试 DeepSeek API 连接...');
console.log('API Key:', deepseekApiKey ? `${deepseekApiKey.substring(0, 8)}...` : '未找到');

// 测试不同的可能端点
const endpoints = [
  'https://api.deepseek.com/v1/chat/completions',
  'https://api.deepseek.com/chat/completions',
  'https://api.deepseek.com/completions'
];

const testEndpoint = (endpoint) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: '测试消息' }
      ],
      max_tokens: 10
    });

    const options = {
      hostname: new URL(endpoint).hostname,
      path: new URL(endpoint).pathname + new URL(endpoint).search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    console.log(`\n📡 测试端点: ${endpoint}`);

    const req = https.request(options, (res) => {
      console.log(`状态码: ${res.statusCode}`);
      console.log('响应头:', res.headers);

      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          console.log('响应数据:', parsed);
          resolve({ endpoint, status: res.statusCode, data: parsed });
        } catch (e) {
          console.log('原始响应:', responseData);
          resolve({ endpoint, status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`请求错误: ${error.message}`);
      reject({ endpoint, error: error.message });
    });

    req.write(data);
    req.end();
  });
};

async function testAllEndpoints() {
  for (const endpoint of endpoints) {
    try {
      await testEndpoint(endpoint);
    } catch (error) {
      console.error(`端点 ${endpoint} 测试失败:`, error);
    }
  }
}

testAllEndpoints().then(() => {
  console.log('\n✅ 所有端点测试完成');
}).catch(console.error);