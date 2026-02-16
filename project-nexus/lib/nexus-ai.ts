import { getAIModel } from './ai-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

// 主路由信息页（Nexus Feed）AI 默认链路标识：
// provider: gemini-nexus-feed（专用分支，便于与 GOC 区分）
// model: Gemini 2.0 Flash
const NEXUS_FEED_PROVIDER = 'gemini-nexus-feed';
const NEXUS_FEED_MODEL = 'gemini-3-flash';

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

    // Nexus Feed 专用默认链路：api.unendev.com/v1 + Gemini 2.0 Flash
    // 通过独立 provider 分支与 GOC 聊天链路做最小隔离，避免行为耦合。
    const { model, providerOptions } = getAIModel({
        provider: NEXUS_FEED_PROVIDER,
        modelId: NEXUS_FEED_MODEL,
        enableThinking: false
    });

    // Content Truncation (Safety against huge payloads)
    const safeContent = content.slice(0, 5000);
    const isRedditSource = /reddit/i.test(source);
    const sourceSpecificRule = isRedditSource
        ? '4. If the title/content is in English, you MUST still output Chinese summary and Chinese tags. Keep Chinese as the only output language for analysis.'
        : '';

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
${sourceSpecificRule}
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
