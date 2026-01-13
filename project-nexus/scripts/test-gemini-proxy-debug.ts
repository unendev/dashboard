
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { env } from '../lib/env'; // Ensure env is loaded properly if possible, or use hardcoded

const TEST_CONFIG = {
    baseUrl: 'https://api.unendev.com/v1',
    apiKey: 'sk-263d3dcfe61c4c3da96d2bcbbb22dc11',
};

async function checkModelsAndTest() {
    console.log("🔍 1. Fetching models...");

    // Explicitly disabling proxy for this fetch to rule out local proxy interference
    // Note: Node fetch picks up proxy env vars by default sometimes. 

    try {
        // Test 1: Simple List Models
        const response = await fetch(`${TEST_CONFIG.baseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${TEST_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`List models failed: ${response.status} ${txt}`);
        }

        const data = await response.json();
        const models = data.data || [];
        console.log(`✅ Models found: ${models.length}`);

        const targetModelId = models.find((m: any) => m.id.includes('gemini-3'))?.id || 'gemini-3-flash';
        console.log(`\n🚀 2. Testing Chat with [${targetModelId}]...`);

        // Manual Fetch for Chat to debug standard OpenAI SDK issues
        const chatPayload = {
            model: targetModelId,
            messages: [{ role: 'user', content: 'hello' }],
            stream: false
        };

        console.log("   Sending raw fetch request to /chat/completions...");
        const chatRes = await fetch(`${TEST_CONFIG.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEST_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chatPayload)
        });

        if (!chatRes.ok) {
            const errTxt = await chatRes.text();
            throw new Error(`Raw Fetch Chat failed: ${chatRes.status} ${errTxt}`);
        }

        const chatData = await chatRes.json();
        console.log(`✅ Raw Fetch Success: "${chatData.choices?.[0]?.message?.content}"`);

        console.log("\n🚀 3. Testing AI SDK...");
        const openai = createOpenAI({
            baseURL: TEST_CONFIG.baseUrl,
            apiKey: TEST_CONFIG.apiKey,
            // Explicitly disable fetch polyfills if any
        });

        const result = await generateText({
            model: openai(targetModelId),
            messages: [{ role: 'user', content: 'hello again' }],
        });

        console.log(`✅ AI SDK Success: "${result.text}"`);

    } catch (error) {
        console.error("\n❌ FAILED:", error);
    }
}

checkModelsAndTest();
