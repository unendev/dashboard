
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env file in root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const GOOGLE_API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;

async function testImageGen() {
    if (!GOOGLE_API_KEY) {
        console.error('ERROR: GOOGLE_AI_STUDIO_API_KEY not found in .env');
        return;
    }

    const google = createGoogleGenerativeAI({
        apiKey: GOOGLE_API_KEY,
    });

    // Test 1: gemini-2.5-flash
    await runTest(google, "gemini-2.5-flash", "Draw a pixel art style cat");
}

async function runTest(google: any, modelId: string, prompt: string) {
    console.log(`\n\nTesting model: ${modelId} with prompt: "${prompt}"`);
    console.log('--------------------------------------------------');

    try {
        const result = await generateText({
            model: google(modelId),
            prompt: prompt,
        });

        console.log('Text Output:', result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''));

        // @ts-ignore
        const files = result.files || [];
        console.log('Files generated:', files.length);

        if (files.length > 0) {
            // @ts-ignore
            files.forEach((f, i) => {
                console.log(`File ${i}: ${f.mediaType}, Size: ${f.content?.length || 0}`);
            });
        } else {
            console.log('WARNING: No images generated. Model treated this as text-only task?');
        }

    } catch (e) {
        console.error('Error during generation:', e);
    }
}

testImageGen();
