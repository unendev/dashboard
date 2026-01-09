import { streamText, convertToModelMessages } from 'ai';
import { getAIModel } from '@/lib/ai-provider';
import { getUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

function buildTreasureAssistantPrompt(
    contextType: string | null,
    treasureData?: { title: string; content: string; tags: string[] },
    existingTags?: { domain: string[]; concept: string[] }
) {
    const basePrompt = `你是藏宝阁的AI标签助手，专门帮助用户优化标签体系。

**标签体系说明：**
- **领域标签** (\`#领域/...\`)：宝藏所属的知识领域（如 \`#领域/技术\`、\`#领域/游戏\`）
- **概念标签** (\`#概念/...\`)：高阶抽象概念（如 \`#概念/创新\`、\`#概念/效率\`）
- **实体标签** (\`#实体/...\`)：由AI自动生成，用户无需管理
- **性质标签** (\`#性质/...\`)：由AI自动生成，用户无需管理

**你的职责：**
仅建议 \`#领域/\` 和 \`#概念/\` 标签，帮助用户完善人类管理的标签维度。

**建议原则：**
1. 优先复用已有标签池中的标签
2. 建议数量：领域标签最多3个，概念标签最多2个
3. 标签要有层级语义（如 \`#领域/技术/前端\`）
4. 避免与用户已选标签重复

**已有标签池：**
- 领域标签：${existingTags?.domain.join(', ') || '暂无'}
- 概念标签：${existingTags?.concept.join(', ') || '暂无'}
`;

    if (contextType === 'create' || contextType === 'edit') {
        return `${basePrompt}

**当前宝藏信息：**
- 标题：${treasureData?.title || '未命名'}
- 内容：${treasureData?.content || '（无内容）'}
- 已选标签：${treasureData?.tags.filter(t => t.startsWith('#领域/') || t.startsWith('#概念/')).join(', ') || '无'}

请基于以上信息，为用户提供标签建议和优化建议。用户会向你提问，请直接回答。`;
    }

    return `${basePrompt}

用户正在浏览藏宝阁，你可以回答关于标签体系、标签使用的问题，或提供通用建议。`;
}

import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        const body = await req.json();
        const { messages, context } = body;
        const modelMessages = convertToModelMessages(messages);

        // 获取用户的标签池
        const treasures = await prisma.treasure.findMany({
            where: { userId },
            select: { tags: true },
        });

        const allTags = treasures.flatMap(t => t.tags || []);
        const domainPool = Array.from(new Set(allTags.filter(tag => tag.startsWith('#领域/'))));
        const conceptPool = Array.from(new Set(allTags.filter(tag => tag.startsWith('#概念/'))));

        // 构建系统提示词
        const systemPrompt = buildTreasureAssistantPrompt(
            context?.type || null,
            context?.treasureData,
            { domain: domainPool, concept: conceptPool }
        );

        console.log('[Treasure Assistant] Request:', {
            userId,
            contextType: context?.type,
            hasTreasureData: !!context?.treasureData,
            msgCount: messages?.length,
        });

        const { model: aiModel, providerOptions } = getAIModel({
            provider: 'deepseek',
            modelId: 'deepseek-chat',
            enableThinking: false,
        });

        const result = streamText({
            model: aiModel,
            system: systemPrompt,
            messages: modelMessages || [],
            providerOptions,
        });

        // 严格参考 GOC 实现：同步调用，特定 Headers
        return (result as any).toUIMessageStreamResponse({
            headers: {
                'Transfer-Encoding': 'chunked',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('[Treasure Assistant] Error:', error);
        return new Response(
            JSON.stringify({
                error: 'AI 请求失败: ' + (error instanceof Error ? error.message : String(error)),
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

export const maxDuration = 30;
