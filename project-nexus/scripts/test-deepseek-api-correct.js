// 测试 DeepSeek API 的正确请求格式
import https from 'https';
import fs from 'fs';

// 从 .env 文件读取 API 密钥
const envContent = fs.readFileSync('.env', 'utf8');
const deepseekApiKey = envContent.match(/DEEPSEEK_API_KEY=(.+)/)?.[1]?.trim();

console.log('🔍 测试 DeepSeek API 正确请求格式...');
console.log('API Key:', deepseekApiKey ? `${deepseekApiKey.substring(0, 8)}...` : '未找到');

// 测试正确的请求格式
const testCorrectFormat = () => {
  return new Promise((resolve, reject) => {
    const requestData = {
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: '你好，请回复一个简短的测试消息。' }
      ],
      stream: false,
      max_tokens: 50,
      temperature: 0.7
    };

    const data = JSON.stringify(requestData);
    console.log('请求数据:', JSON.stringify(requestData, null, 2));

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log(`\n📡 测试端点: https://api.deepseek.com/v1/chat/completions`);
    console.log('请求方法:', options.method);
    console.log('请求头:', options.headers);

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
          console.log('✅ 成功响应:', JSON.stringify(parsed, null, 2));
          resolve({ success: true, status: res.statusCode, data: parsed });
        } catch (e) {
          console.log('❌ JSON 解析失败，原始响应:', responseData);
          resolve({ success: false, status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ 请求错误: ${error.message}`);
      reject({ error: error.message });
    });

    req.write(data);
    req.end();
  });
};

testCorrectFormat().then((result) => {
  if (result.success) {
    console.log('\n🎉 DeepSeek API 连接成功！');
  } else {
    console.log('\n💥 DeepSeek API 连接失败，需要进一步调试。');
  }
}).catch(console.error);