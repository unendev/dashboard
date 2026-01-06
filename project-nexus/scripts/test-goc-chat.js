// 测试 GOC 聊天 API
async function testGOCChat() {
  console.log('🧪 测试 GOC 聊天 API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/goc-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '你好，请简单回复确认连接成功。' }
        ],
        notes: '测试笔记',
        players: [{ id: 'test-user', name: 'Test User' }],
        mode: 'advisor',
        model: 'deepseek',
        roomId: 'test-room-123'
      }),
    });

    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GOC 聊天 API 调用失败:');
      console.error('响应内容:', errorText);
      return false;
    }

    console.log('✅ GOC 聊天 API 连接成功！');
    
    // 读取流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;
      console.log('📝 收到数据块:', chunk);
    }

    console.log('📝 完整响应:', fullResponse);
    return true;
    
  } catch (error) {
    console.error('❌ 网络错误:', error.message);
    return false;
  }
}

// 运行测试
testGOCChat().then(success => {
  process.exit(success ? 0 : 1);
});