
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const TEST_CONFIG = {
    baseUrl: 'https://api.unendev.com/v1',
    apiKey: 'sk-263d3dcfe61c4c3da96d2bcbbb22dc11',
};

async function checkModelsAndTest() {
    console.log("🔍 1. 正在获取支持的模型列表...");

    try {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${TEST_CONFIG.apiKey}` }
        });

        if (!response.ok) {
            throw new Error(`List models failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const models = data.data || [];
        console.log(`✅ 获取成功! 发现 ${models.length} 个模型:`);

        // 打印所有带 gemini 的模型
        const geminiModels = models.filter((m: any) => m.id.includes('gemini'));
        geminiModels.forEach((m: any) => console.log(`   - ${m.id}`));

        if (geminiModels.length === 0) {
            console.log("⚠️ 未在列表中发现包含 'gemini' 的模型 ID，打印前 5 个:");
            models.slice(0, 5).forEach((m: any) => console.log(`   - ${m.id}`));
            return;
        }

        // 尝试使用第一个找到的 3.x 模型进行测试
        const targetModelId = geminiModels.find((m: any) => m.id.includes('gemini-3'))?.id || geminiModels[0].id;

        console.log(`\n🚀 2. 尝试使用模型 [${targetModelId}] 进行对话测试...`);

        const openai = createOpenAI({
            baseURL: TEST_CONFIG.baseUrl,
            apiKey: TEST_CONFIG.apiKey,
        });

        const result = await generateText({
            model: openai(targetModelId),
            messages: [{ role: 'user', content: 'Hi, are you online? Answer just "Yes".' }],
        });

        console.log(`\n✅ 对话测试成功!`);
        console.log(`📝 回复: "${result.text}"`);

    } catch (error) {
        console.error("\n❌ 操作失败:", error);
    }
}

checkModelsAndTest();
