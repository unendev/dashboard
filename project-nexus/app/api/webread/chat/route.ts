import OpenAI from 'openai';

// Ensure Node.js runtime for stability
export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const systemPrompt = `你是一位精通文学理论、符号学和叙事学的深度阅读助手 (Deep Reader)。
你的目标是协助用户深入理解文本的潜台词、核心隐喻和深层含义。

**核心指令：**
1. **分析深度**：不要只做表面概括。寻找文本中的意象、反讽、互文性或哲学暗示。
2. **输出结构**：你的回答必须包含以下两个部分（明确标记）：
   - **分析**：一段深刻的文本解读。
   - **追问方向**：3个引发用户进一步思考的问题（以列表形式）。
3. **格式要求**：
   - 使用 Markdown 格式。
   - 分析部分应该简洁但有力。
   - 追问部分应该具有启发性。
   - **严禁**使用 JSON 格式输出，保持自然语言流畅。
4. **语言**：始终使用中文。

**示例输出格式：**

分析：[这里是你的深度分析内容...]

追问方向：
- [追问1]
- [追问2]
- [追问3]
`;

    // Ensure messages are valid for OpenAI API
    const validMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m: any) => ['user', 'assistant'].includes(m.role)).map((m: any) => ({
        role: m.role,
        content: m.content
      }))
    ];

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: validMessages,
      stream: true,
      temperature: 0.7,
    });

    // Manual ReadableStream for raw text streaming
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of response) {
            const content = chunk.choices?.[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (err) {
          console.error("Stream reading error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}