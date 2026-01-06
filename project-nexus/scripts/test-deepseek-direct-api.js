// 直接测试 DeepSeek API，不使用 AI SDK
import https from 'https';
import fs from 'fs';

// 从 .env 文件读取 API 密钥
const envContent = fs.readFileSync('.env', 'utf8');
const deepseekApiKey = envContent.match(/DEEPSEEK_API_KEY=(.+)/)?.[1]?.trim();

console.log('🔍 直接测试 DeepSeek API...');

const testDirectAPI = () => {
  return new Promise((resolve, reject) => {
    const requestData = {
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: '你好，这是一个测试消息。' }
      ],
      stream: false,
      max_tokens: 50,
      temperature: 0.7
    };

    const data = JSON.stringify(requestData);
    
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

    console.log(`📡 发送请求到: https://api.deepseek.com/v1/chat/completions`);

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

testDirectAPI().then((result) => {
  if (result.success) {
    console.log('\n🎉 DeepSeek API 直接调用成功！');
  } else {
    console.log('\n💥 DeepSeek API 直接调用失败。');
  }
}).catch(console.error);