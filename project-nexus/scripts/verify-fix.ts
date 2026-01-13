
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// 模拟 production 环境以绕过 lib/ai-provider 里的代理逻辑，
// 或者直接手动测试 直连 连接
const TEST_CONFIG = {
    baseUrl: 'https://api.unendev.com/v1',
    apiKey: 'sk-263d3dcfe61c4c3da96d2bcbbb22dc11',
};

async function verifyDirectConnection() {
    console.log("🚀 Testing Direct Connection (No Proxy)...");

    try {
        const openai = createOpenAI({
            baseURL: TEST_CONFIG.baseUrl,
            apiKey: TEST_CONFIG.apiKey,
            // 关键：不传递任何 proxy 配置，模拟修复后的代码行为
        });

        const start = Date.now();
        const result = await generateText({
            model: openai('gemini-3-flash'),
            messages: [{ role: 'user', content: 'Ping' }],
        });

        console.log(`✅ Success! Response time: ${Date.now() - start}ms`);
        console.log(`📝 Output: ${result.text}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed:", error);
        process.exit(1);
    }
}

verifyDirectConnection();
