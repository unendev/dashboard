// 测试修复后的 GOC Chat API
import http from 'http';

const testGocChat = () => {
  return new Promise((resolve, reject) => {
    const requestData = {
      messages: [
        { role: 'user', content: '你好，这是一个测试消息。' }
      ],
      notes: '测试笔记内容',
      players: [
        { id: 'user-123', name: '测试用户' }
      ],
      mode: 'advisor',
      roomId: 'test-room-123',
      model: 'deepseek'
    };

    const data = JSON.stringify(requestData);
    console.log('🔍 测试 GOC Chat API...');
    console.log('请求数据:', JSON.stringify(requestData, null, 2));

    const options = {
      hostname: 'localhost',
      port: 10000,
      path: '/api/goc-chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log(`\n📡 发送请求到: http://localhost:10000/api/goc-chat`);

    const req = http.request(options, (res) => {
      console.log(`状态码: ${res.statusCode}`);
      console.log('响应头:', res.headers);

      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
        process.stdout.write(chunk); // 实时显示流式响应
      });

      res.on('end', () => {
        console.log('\n✅ 请求完成');
        resolve({ success: res.statusCode === 200, status: res.statusCode, data: responseData });
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

// 检查开发服务器是否运行
const checkServer = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: '/',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      console.log('✅ 开发服务器正在运行');
      resolve(true);
    });

    req.on('error', () => {
      console.log('❌ 开发服务器未运行，请先运行 npm run dev');
      reject(false);
    });

    req.on('timeout', () => {
      console.log('❌ 开发服务器响应超时');
      reject(false);
    });

    req.end();
  });
};

async function runTest() {
  try {
    await checkServer();
    await testGocChat();
  } catch (error) {
    console.error('测试失败:', error);
  }
}

runTest();