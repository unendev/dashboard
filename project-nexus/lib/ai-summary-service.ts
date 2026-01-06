import { streamText, type CoreMessage } from 'ai';
import { getAIModel } from './ai-provider';

/**
 * 使用指定的AI模型为对话历史生成摘要。
 * @param messages 对话历史消息数组
 * @returns 返回生成的摘要文本
 */
export async function generateContextSummary(messages: CoreMessage[]): Promise<string> {
  if (!messages || messages.length === 0) {
    return '';
  }

  // 1. 准备用于摘要的对话文本
  const conversationText = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');
    
  if (!conversationText.trim()) {
    return '';
  }
    
  // 2. 获取专门用于摘要的轻量级模型
  const { model: summaryModel } = getAIModel({
    provider: 'gemini',
    modelId: 'gemini-2.5-flash', // 强制使用flash模型
    enableThinking: false, // 摘要不需要思考过程
  });

  // 3. 构建摘要请求的 System Prompt
  const systemPrompt = `You are a conversation summarizer. Your task is to create a concise summary of the provided dialogue history. 
Focus on key decisions, important facts, and unresolved questions.
The summary will be used as context for another AI, so it must be clear and information-dense.
Respond ONLY with the summary, in Chinese.`;

  try {
    // 4. 调用 AI 生成摘要
    const result = await streamText({
      model: summaryModel,
      system: systemPrompt,
      prompt: `Please summarize the following conversation:\n\n---\n${conversationText}\n---`,
    });

    // 5. 返回完整的摘要文本
    let summary = '';
    for await (const delta of result.textStream) {
      summary += delta;
    }
    
    console.log('[AI Summary Service] Generated summary:', summary);
    return summary;

  } catch (error) {
    console.error('❌ Error generating context summary:', error);
    // 在失败时返回空字符串，避免阻塞主流程
    return '';
  }
}
