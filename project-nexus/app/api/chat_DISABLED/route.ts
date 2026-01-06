import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, tool } from 'ai';
import { z } from 'zod';

export const runtime = 'edge';

export async function POST(req: Request) {
  console.log('[API/CHAT] Request received at /api/chat');
  console.log('[API/CHAT] Request URL:', req.url);
  console.log('[API/CHAT] Headers:', Object.fromEntries(req.headers.entries()));
  try {
    // Check for the API key before anything else
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('[API/CHAT] DEEPSEEK_API_KEY not set!');
      return new Response('DeepSeek API key not configured.', { status: 500 });
    }

    const body = await req.json();
    const { messages, mode, roomId } = body;

    // 调试：如果此通用路由收到了 GOC 特定的参数，说明路由匹配错误，应该去 /api/goc-chat
    if (mode || roomId) {
      console.warn(`[API/CHAT] Received GOC-specific parameters (mode: ${mode}, roomId: ${roomId}). This request should target /api/goc-chat. Returning 403.`);
      return new Response('Forbidden: Incorrect API endpoint for GOC request.', { status: 403 });
    }
    
    console.log('[API/CHAT] Request body keys:', Object.keys(body));
    console.log('[API/CHAT] Request body:', { messagesCount: messages?.length });
    
    if (!messages) {
        return new Response('Messages array is required for general chat.', { status: 400 });
    }

    // Define the tool for structured analysis output
    const analyzeTextTool = tool({
        description: 'Analyzes a given text snippet and returns its core metaphor/meaning along with follow-up questions.',
        inputSchema: z.object({
            analysis: z.string().describe('The core metaphor or deeper meaning of the text.'),
            followUpQuestions: z.array(z.string()).describe('A list of 3 concise follow-up questions for deeper thought or exploration, based on the analysis.'),
        }),
        // The execute function for this tool just defines the output schema.
        // The AI will use this schema to structure its response, not to perform an action.
        execute: async (input) => { return input; }, 
    });

    // Convert UIMessage[] to ModelMessage[] for streamText
    const modelMessages = convertToModelMessages(messages);

    // Create DeepSeek model using Vercel AI SDK
    const deepseek = createOpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
      // Use custom fetch to intercept and fix developer role conversion
      // @ai-sdk/openai may convert system messages to developer role for reasoning models
      // but DeepSeek API doesn't support 'developer' role
      fetch: async (url, init) => {
        if (init?.body) {
          try {
            const body = JSON.parse(init.body as string);
            // Fix developer role conversion issue: DeepSeek doesn't support 'developer' role
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (body.messages && Array.isArray(body.messages)) {
              body.messages = body.messages.map((msg: any) => {
                if (msg.role === 'developer') {
                  return { ...msg, role: 'system' };
                }
                return msg;
              });
            }
            init.body = JSON.stringify(body);
          } catch (e) {
            // If parsing fails, continue with original body
          }
        }
        return fetch(url, init);
      },
    });

    // Use streamText from Vercel AI SDK
    // DeepSeek uses Chat API endpoint (/v1/chat/completions), not Responses API
    const result = streamText({
      model: deepseek.chat('deepseek-chat'),
      messages: modelMessages,
      tools: { analyzeTextTool }, // Provide the tool to the AI (Fixed TS error)
      toolChoice: 'auto', // Let the AI decide if it wants to use the tool
    });

    // Return the standard Vercel AI SDK stream response
    // This will now include tool calls if the AI decides to use analyzeTextTool
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in /api/chat:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}