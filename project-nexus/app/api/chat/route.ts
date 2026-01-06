import { streamText, convertToModelMessages } from 'ai';
import { getAIModel } from '@/lib/ai-provider';

// 判断是否是思考模型 (用于前端 UI 开关逻辑辅助，虽然后端也判断，但这里主要是为了日志)
function isThinkingModel(provider: string, model: string): boolean {
  if (provider === 'deepseek' && model === 'deepseek-reasoner') return true;
  if (provider === 'gemini' && (model.includes('gemini-2.5-pro') || model.includes('gemini-3'))) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, provider = 'deepseek', model } = body;

    // 获取模型实例和配置
    // 注意：这里不再从 body 中直接取 apiKey，而是统一使用环境变量（通过 ai-provider）
    // 如果需要支持自定义 API Key，可以修改 getAIModel 接口，但通常不建议暴露给客户端
    
    // 检查是否显式请求思考模式 (enableThinking)，或者根据模型自动判断
    // 注意：这里我们简化逻辑，优先使用前端传递的参数，如果没有则自动推断
    const effectiveModel = model || (provider === 'gemini' ? 'gemini-2.5-flash' : 'deepseek-chat');
    const enableThinking = isThinkingModel(provider, effectiveModel);
    
    console.log('[Chat API] Request:', { provider, model: effectiveModel, thinking: enableThinking, msgCount: messages?.length });

    const { model: aiModel, providerOptions } = getAIModel({ 
      provider, 
      modelId: effectiveModel, 
      enableThinking 
    });

    // 处理消息 - 支持 UIMessage 格式（useChat）和简单格式
    let systemPrompt: string | undefined;
    let modelMessages: any[];

    if (messages?.[0]?.parts) {
      modelMessages = convertToModelMessages(messages);
    } else {
      const systemMsg = messages?.find((m: any) => m.role === 'system');
      systemPrompt = systemMsg?.content;
      modelMessages = messages
        ?.filter((m: any) => m.role !== 'system')
        .map((m: any) => ({ role: m.role, content: m.content })) || [];
    }

    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: modelMessages,
      providerOptions,
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: enableThinking,
      headers: {
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'AI 请求失败: ' + (error instanceof Error ? error.message : String(error)) 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}