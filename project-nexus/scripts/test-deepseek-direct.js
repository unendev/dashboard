// 直接测试 DeepSeek API 端点
async function testDeepSeekDirect() {
  console.log('🧪 直接测试 DeepSeek API 端点...');
  
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error('❌ DEEPSEEK_API_KEY 环境变量未设置');
    return false;
  }

  try {
    console.log('📡 测试端点: https://api.deepseek.com/chat/completions');
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: '你好，请简单回复确认连接成功。' }
        ],
        stream: false,
        max_tokens: 50
      }),
    });

    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 调用失败:');
      console.error('响应内容:', errorText);
      return false;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    if (content) {
      console.log('✅ DeepSeek API 连接成功！');
      console.log('📝 响应内容:', content);
      return true;
    } else {
      console.error('❌ 响应格式异常:', result);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 网络错误:', error.message);
    return false;
  }
}

// 运行测试
testDeepSeekDirect().then(success => {
  process.exit(success ? 0 : 1);
});