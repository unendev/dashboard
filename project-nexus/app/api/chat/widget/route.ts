/**
 * Widget AI Chat API - 支持函数调用更新本地备忘录和待办
 */

import { createGoogleGenerativeAI, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import { env } from "@/lib/env";

const proxyConfig: any = {};

const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
if (proxyUrl) {
  proxyConfig.httpAgent = proxyUrl;
  proxyConfig.httpsAgent = proxyUrl;
}

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_AI_STUDIO_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY,
  ...proxyConfig,
});

const deepseek = createDeepSeek({
  apiKey: env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, provider = 'deepseek', modelId = 'deepseek-chat' } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array is required', { status: 400 });
    }

    const systemPrompt = `你是一个桌面小组件的 AI 助手。你可以帮助用户：
1. 更新备忘录内容
2. 添加待办事项
3. 回答问题

当用户要求更新备忘录或添加待办时，使用对应的工具。
对于简单问题，直接回答即可。
请用中文回复。`;

    // Widget 专用工具 - 返回指令让前端执行
    const tools = {
      updateMemo: tool({
        description: '更新备忘录内容。用户说"记一下"、"备忘"、"笔记"时使用。',
        inputSchema: z.object({
          content: z.string().describe('要写入备忘录的完整内容'),
          append: z.boolean().optional().describe('是否追加到现有内容末尾，默认 true'),
        }),
        execute: async ({ content, append = true }) => {
          console.log('[Widget AI] Tool updateMemo called:', { content: content.slice(0, 50), append });
          return JSON.stringify({
            action: 'UPDATE_MEMO',
            content,
            append,
          });
        },
      }),
      addTodo: tool({
        description: '添加待办事项。用户说"待办"、"任务"、"要做"时使用。',
        inputSchema: z.object({
          text: z.string().describe('待办事项内容'),
          group: z.string().optional().describe('分组名称，默认 default'),
        }),
        execute: async ({ text, group = 'default' }) => {
          console.log('[Widget AI] Tool addTodo called:', { text, group });
          return JSON.stringify({
            action: 'ADD_TODO',
            text,
            group,
          });
        },
      }),
    };

    const modelMessages = convertToModelMessages(messages);
    
    // 模型选择与思考配置（参考 GOC）
    let selectedModel: any;
    let providerOptions: any = {};
    
    // 判断是否是支持思考的模型
    const isThinkingModel = modelId === 'deepseek-reasoner' || 
      modelId.includes('gemini-2.5') || 
      modelId.includes('gemini-3');
    
    console.log(`[Widget AI] Model: ${provider}/${modelId}, thinking: ${isThinkingModel}`);
    
    if (provider === 'gemini') {
      selectedModel = google(modelId);
      
      // Gemini 思考配置
      if (isThinkingModel) {
        const thinkingConfig: any = { includeThoughts: true };
        
        if (modelId.includes('gemini-3')) {
          thinkingConfig.thinkingLevel = 'high';
        } else if (modelId === 'gemini-2.5-flash') {
          thinkingConfig.thinkingBudget = 8192;
        }
        
        providerOptions = {
          google: { thinkingConfig } satisfies GoogleGenerativeAIProviderOptions,
        };
      }
    } else {
      selectedModel = deepseek(modelId);
    }

    const result = streamText({
      model: selectedModel,
      system: systemPrompt,
      messages: modelMessages,
      tools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(3),
      providerOptions,
    });

    // 对于支持思考的模型，发送 reasoning
    return result.toUIMessageStreamResponse({
      sendReasoning: isThinkingModel,
      headers: {
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error(`[Widget AI] Error:`, error?.message);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
