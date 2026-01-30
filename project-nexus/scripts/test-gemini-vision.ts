import { streamText } from 'ai';
import { getAIModel } from '../lib/ai-provider.js';

// 设置必需的环境变量
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = '42c21b671f8263321b9866da66fa952791ee8f401ceef429c12c07702eb32d71';
process.env.GOOGLE_AI_STUDIO_API_KEY = 'AIzaSyCulmrCdvuj2PCBqpZd9h27noIpcp3R8jk';
process.env.GEMINI_API_KEY = 'AIzaSyCV3RYFs_9DAeRkFBxFUfcMifYx3PIz8ds';

async function testImageInput() {
    console.log('=== Testing Gemini Vision with Image URL ===\n');

    const testImageUrl = 'https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true';

    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: '请详细描述这张图片' },
                { type: 'image', image: testImageUrl }
            ]
        }
    ];

    console.log('Input messages:', JSON.stringify(messages, null, 2));
    console.log('\n--- Calling Gemini 2.5 Flash ---\n');

    try {
        const { model } = getAIModel({
            provider: 'gemini',
            modelId: 'gemini-2.5-flash',
            enableThinking: false
        });

        const result = await streamText({
            model,
            messages: messages as any,
        });

        console.log('Stream started successfully!\n');
        console.log('Response:');

        for await (const chunk of result.textStream) {
            process.stdout.write(chunk);
        }

        console.log('\n\n✅ Test completed successfully!');
    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
    }
}

testImageInput();
