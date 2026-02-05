import { getAIModel } from './ai-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

// Define the output structure for Intelligence Analysis
const AnalysisSchema = z.object({
    summary: z.string().describe("A concise 1-2 sentence summary of the content in Chinese."),
    relevanceScore: z.number().min(0).max(10).describe("A rating from 0-10 on how valuable/interesting this content is for a developer/gamer."),
    tags: z.array(z.string()).describe("3-5 keywords or tags extracted from the content."),
    sentiment: z.enum(['positive', 'negative', 'neutral']).describe("The overall sentiment."),
});

export type NexusAnalysisResult = z.infer<typeof AnalysisSchema>;

export async function analyzeNexusItem(
    title: string,
    content: string,
    source: string
): Promise<NexusAnalysisResult | null> {

    // Choose model: Prioritize 'gemini-3-flash' (Google Native Proxy) as requested
    // The 'gemini' provider string triggers the complex routing logic in ai-provider.ts
    // which knows how to handle 'gemini-3-*' by using the Custom Google Native Provider.
    const { model, providerOptions } = getAIModel({
        provider: 'gemini',
        modelId: 'gemini-3-flash', // User's preferred high-speed model
        enableThinking: false
    });

    // Content Truncation (Safety against huge payloads)
    const safeContent = content.slice(0, 5000);

    const prompt = `
You are Nexus AI, an intelligence officer for a Game Developer & Tech Enthusiast.
Analyze the following incoming data stream item.

[Source]: ${source}
[Title]: ${title}
[Content]:
${safeContent}

Task:
1. Summarize the main point in Chinese (Concise).
2. Rate relevance (0-10) for a game developer/tech user. (High for: AI, Coding, Game Design, Major Industry News. Low for: Gossip, Ads).
3. Extract Tags.
`;

    try {
        const result = await generateObject({
            model: model,
            schema: AnalysisSchema,
            prompt: prompt,
            ...providerOptions
        });

        // Vercel AI SDK 3.x+ returns structured data
        return result.object as NexusAnalysisResult;

    } catch (error) {
        console.error('[Nexus AI] Analysis Failed:', error);
        // Fallback or return null to skip AI metadata
        return null;
    }
}
