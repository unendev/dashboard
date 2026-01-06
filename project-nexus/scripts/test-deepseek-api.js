import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// 测试 DeepSeek API 配置
async function testDeepSeekAPI() {
  console.log('🧪 测试 DeepSeek API 配置...');
  
  try {
    // 使用与 goc-chat 相同的配置
    const deepseek = createOpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
      compatibility: 'compatible', // Force compatible mode to avoid OpenAI-specific endpoints
    });

    console.log('📡 尝试连接到 DeepSeek API...');
    
    // 测试简单的聊天完成
    const result = await generateText({
      model: deepseek('deepseek-chat'),
      prompt: '你好，请简单回复确认连接成功。',
      maxTokens: 50,
    });

    console.log('✅ DeepSeek API 连接成功！');
    console.log('📝 响应内容:', result.text);
    
    return true;
  } catch (error) {
    console.error('❌ DeepSeek API 连接失败:');
    console.error('错误详情:', error.message);
    
    if (error.message.includes('404')) {
      console.error('💡 可能的原因：API 端点配置错误');
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('💡 可能的原因：API 密钥无效或未配置');
    }
    
    return false;
  }
}

// 运行测试
testDeepSeekAPI().then(success => {
  process.exit(success ? 0 : 1);
});