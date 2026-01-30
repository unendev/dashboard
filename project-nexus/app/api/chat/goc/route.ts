import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import { Liveblocks } from "@liveblocks/node";
import { LiveList, LiveMap } from "@liveblocks/client";
import { env } from "@/lib/env";
import { getAIModel } from '@/lib/ai-provider';

let _liveblocks: Liveblocks | null = null;

function getLiveblocks() {
  if (!_liveblocks) {
    _liveblocks = new Liveblocks({
      secret: env.LIVEBLOCKS_SECRET_KEY as string,
    });
  }
  return _liveblocks;
}

export const maxDuration = 60;

// 记录工具调用到 Liveblocks
async function logToolCall(roomId: string, toolName: string, args: any, result: string) {
  try {
    await getLiveblocks().mutateStorage(roomId, ({ root }: any) => {
      let toolLogs = root.get('toolLogs');
      if (!toolLogs) {
        toolLogs = new LiveList([]);
        root.set('toolLogs', toolLogs);
      }
      toolLogs.push({
        id: crypto.randomUUID(),
        toolName,
        args,
        result,
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error('❌ Failed to log tool call:', error);
  }
}

export async function POST(req: Request) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  console.log(`[GOC] Request: ${requestId}`);

  try {
    const body = await req.json();
    const { messages, data, players, mode, roomId, provider, modelId, currentPlayerName, enableThinking } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array is required', { status: 400 });
    }

    if (!roomId) {
      return new Response('Room ID is required', { status: 400 });
    }

    const playerContext = (players && Array.isArray(players)) ? players.map((p: any) => `- ${p.name} (ID: ${p.id})`).join('\n') : "Unknown";

    let modeInstruction = "";
    switch (mode) {
      case 'interrogator':
        modeInstruction = `**Current Mode: Interrogator** - Actively gather intelligence. Ask sharp questions.`;
        break;
      case 'planner':
        modeInstruction = `**Current Mode: Planner** - Create structured plans. Use tools to update notes and add todos.`;
        break;
      case 'encyclopedia':
        modeInstruction = `**Current Mode: Encyclopedia** - Provide deep insights into complex topics (social sciences, history, etc.). Encourage structured discussion and critical thinking.`;
        break;
      default:
        modeInstruction = `**Current Mode: Tactical Advisor** - Provide real-time decision support.`;
        break;
    }

    const systemPrompt = `You are an elite Game Operations Center (GOC) AI Tactical Advisor and Knowledge Curator (Nexus AI).
Your goal is to assist players with games or complex discussions. You have access to tools to read and update shared "Field Notes" and manage todos.

**Current Speaker:** ${currentPlayerName || 'Unknown'}
(When the user asks for "my" personal notes/todos, use this name)

**Online Players:**
${playerContext}

${modeInstruction}

**General Directives:**
1. You MUST reply in Chinese.
2. Be a calm, professional co-pilot.
3. For simple questions or greetings, respond directly without using tools.
4. Use getNotes tool when you need context about the current situation (shared or personal notes).
5. Only use updateNote or addTodo when explicitly requested or creating action items.
6. When user asks for personal items (my notes, my todos), use the current speaker's name.
`;

    const tools = {
      getNotes: tool({
        description: 'Read the current shared Field Notes and all individual player notes.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            let sharedNotes = '(No shared notes)';
            let playerNotesSummary = '';

            await getLiveblocks().mutateStorage(roomId, ({ root }: any) => {
              sharedNotes = root.get('notes') || '(No shared notes)';

              const pNotes = root.get('playerNotes');
              if (pNotes) {
                // pNotes is a LiveMap
                const entries = Array.from(pNotes.entries());
                if (entries.length > 0) {
                  playerNotesSummary = entries.map(([id, data]: any) => {
                    const name = (typeof data === 'object' && data?.name) ? data.name : `Player ${id.slice(-4)}`;
                    const content = (typeof data === 'object' && data?.content) ? data.content : (typeof data === 'string' ? data : '');
                    return `[${name}'s Personal Note]:\n${content}`;
                  }).join('\n\n');
                }
              }
            });

            const result = `Current Shared Field Notes:\n"""
${sharedNotes}
"""

${playerNotesSummary || 'No individual player notes available.'}`;
            await logToolCall(roomId, 'getNotes', {}, result);
            return result;
          } catch (error) {
            console.error('❌ Failed to read notes:', error);
            return '(Unable to read notes)';
          }
        },
      }),
      updateNote: tool({
        description: 'Update a note. Can be the shared note or a specific player\'s personal note.',
        inputSchema: z.object({
          target: z.string().describe('Use "shared" for shared notes, or a player NAME (not ID) for personal note.'),
          content: z.string().describe('The full, new content of the note.'),
        }),
        execute: async ({ target, content }) => {
          try {
            let storageKey = target;
            if (target !== 'shared' && players) {
              const player = players.find((p: any) =>
                p.name?.toLowerCase() === target.toLowerCase() || p.id === target
              );
              if (player) {
                storageKey = player.id;
              }
            }

            await getLiveblocks().mutateStorage(roomId, ({ root }: any) => {
              if (target === 'shared') {
                root.set('notes', content);
              } else {
                let pNotes = root.get('playerNotes');
                if (!pNotes) {
                  pNotes = new LiveMap();
                  root.set('playerNotes', pNotes);
                }
                pNotes.set(storageKey, content);
              }
            });
            const result = `Notes updated successfully for ${target}.`;
            await logToolCall(roomId, 'updateNote', { target, content }, result);
            return result;
          } catch (error) {
            console.error('❌ Failed to update note:', error);
            throw new Error(`Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        },
      }),
      addTodo: tool({
        description: 'Add a new task to the to-do list. Can be shared or personal, and can be grouped.',
        inputSchema: z.object({
          task: z.string().describe('A concise description of the task.'),
          group: z.string().optional().describe('Optional group name for organizing tasks (e.g., "Day 1", "Resources", "Combat").'),
          isPersonal: z.boolean().optional().describe('If true, this is a personal task visible only to the requesting player.'),
          playerName: z.string().optional().describe('Player name for personal tasks.'),
        }),
        execute: async ({ task, group, isPersonal, playerName }) => {
          try {
            let ownerId = null;
            let ownerName = null;
            if (isPersonal && playerName && players) {
              const player = players.find((p: any) =>
                p.name?.toLowerCase() === playerName.toLowerCase()
              );
              if (player) {
                ownerId = player.id;
                ownerName = player.name;
              }
            }

            await getLiveblocks().mutateStorage(roomId, ({ root }: any) => {
              let todos = root.get('todos');
              if (!todos) {
                todos = new LiveList([]);
                root.set('todos', todos);
              }
              todos.push({
                id: crypto.randomUUID(),
                text: task,
                completed: false,
                group: group || 'default',
                parentId: null,
                ownerId,
                ownerName,
              });
            });
            const result = isPersonal
              ? `Personal todo added for ${ownerName || playerName}: ${task}`
              : `Todo added${group ? ` to group "${group}"` : ''}: ${task}`;
            await logToolCall(roomId, 'addTodo', { task, group, isPersonal, playerName }, result);
            return result;
          } catch (error) {
            console.error('❌ Failed to add todo:', error);
            throw new Error(`Failed to add todo: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        },
      }),
    };

    // --- Gemini Vision Support: Process Attachments ---
    // The frontend sends OSS URLs in 'experimental_attachments'.
    // Gemini (via Vercel SDK) expects Uint8Array for images in 'content'.
    // We must fetch the images from the URLs and convert them.

    // We need to mutate the modelMessages before sending to streamText/generateText.
    // However, modelMessages is derived from 'messages' using convertToModelMessages.
    // We should process 'messages' first or process 'modelMessages' directly.
    // Processing 'modelMessages' is safer as it's the final format content.

    // [GOC Strategy: Bypass Buggy convertToModelMessages]
    // SDK 5.0.118 的 convertToModelMessages 在处理图片时会崩溃
    // 根据官方文档，streamText 可以直接接受标准消息格式
    // 我们直接传递 messages，不进行转换

    let processedModelMessages = messages as any;

    // [GOC Debug] Provider/Model logging
    console.log(`[GOC Debug] Provider=${provider}, ModelId=${modelId}, MessageCount=${messages.length}`);
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      console.log(`[GOC Debug] Last Message Preview:`, JSON.stringify(lastMsg, null, 2));
    }

    // Only process if using Gemini provider (as per requirement) and there are messages with content
    if (provider === 'gemini' || modelId?.includes('gemini')) {
      processedModelMessages = await Promise.all(processedModelMessages.map(async (msg: any) => {
        if (msg.role === 'user' && Array.isArray(msg.content)) {
          const newContent = await Promise.all(msg.content.map(async (part: any) => {
            // Check if it's an image part with a URL (Vercel SDK might have mapped it to 'image' type with 'url' or kept as is)
            // standard Vercel SDK convertToModelMessages might not strictly handle the 'experimental_attachments' -> 'image-part' mapping for URL strings perfectly for all providers.
            // But let's assume we receive standard CoreMessage structure where content can be array of parts.

            // The frontend sends 'experimental_attachments' which convertToModelMessages usually turns into image parts if they are URLs?
            // Actually, convertToModelMessages might just keep them if they are in the right format.
            // Let's check if we have image parts with absolute HTTP URLs.

            // [GOC Debug] Log the part to see what we are dealing with
            // console.log('[GOC Debug] Processing part:', JSON.stringify(part, null, 2));

            const isImagePart = part.type === 'image';
            const hasImageUrl = part.image && (part.image instanceof URL || typeof part.image === 'string');

            if (isImagePart && hasImageUrl) {
              // SDK already parsed it as URL object?
              try {
                const imageUrl = part.image.toString();
                console.log(`[GOC] Fetching image for Vision: ${imageUrl}`);
                const response = await fetch(imageUrl);
                const arrayBuffer = await response.arrayBuffer();
                const base64Data = Buffer.from(arrayBuffer).toString('base64');
                console.log(`[GOC] Image downloaded & converted to Base64. Length: ${base64Data.length}`);

                return {
                  type: 'image',
                  image: new Uint8Array(arrayBuffer), // Vercel SDK handles Uint8Array -> base64 for Google provider?
                  // However, for Google REST API directly we need base64. 
                  // The AI SDK's 'google' provider should handle Uint8Array.
                  mimeType: part.mimeType || 'image/webp'
                };
              } catch (e) {
                console.error(`[GOC] Failed to fetch image for Vision:`, e);
                return part; // Fallback
              }
            }

            return part; // Return text or other parts as is
          }));
          return { ...msg, content: newContent };
        }
        return msg;
      }));
    }

    // 使用统一的 getAIModel 逻辑
    const { model: selectedModel, providerOptions } = getAIModel({
      provider,
      modelId,
      enableThinking
    });

    console.log(`[GOC] Model initialized: ${provider}/${modelId || 'default'}`);

    // 拦截文生图模型请求
    if (modelId === 'gemini-3-pro-image-preview') {
      try {
        const { uploadBufferToOss } = await import('@/lib/oss-server');
        const { generateText } = await import('ai');

        console.log(`[GOC] Generating image with prompt: "${messages[messages.length - 1].content}"`);

        // 使用 generateText 而非 streamText
        // 注意：model 必须包含 -image 才能触发多模态生成? 
        // 用户提供的 ID 是 'gemini-3-pro-image-preview'，我们需要确保底层 provider 调用的是正确的 Google 模型 ID
        // Gemini API 3.0 可能也叫 'gemini-2.5-flash-image-preview' 或者其他，这里假设 provider 内部处理了映射或者直接透传
        // 既然 types.ts 写的是 'gemini-3-pro-image-preview'，我们暂时认为它就是目标模型的 ID。
        // 但根据用户提供的文档，推荐 'gemini-2.5-flash-image-preview'。
        // 为了保险，我们可以强制在这里 override 为 'gemini-2.5-flash-image-preview' 如果用户选的是这个特定 ID
        // 或者相信 lib/ai-provider.ts 能正确返回 google provider。

        // 使用用户指定的 Gemini 3.0 Pro Image 模型
        const imageGenModel = getAIModel({ provider, modelId: 'gemini-3-pro-image-preview' }).model;

        const result = await generateText({
          model: imageGenModel,
          messages: convertToModelMessages(messages),
        });

        // 检查是否有生成的图片文件
        // 根据 Vercel SDK 00-guides/20-google-gemini-image-generation:
        // result.files? 
        // ai-sdk/google 实现会把 image put in result.experimental_output? 
        // User docs say: result.files

        // TS Hack: result type might not expose files in current generic definition if version mismatch, 
        // cast to any to access provider-specific fields
        const files = (result as any).files || (result as any).experimental_output?.files;

        if (files && files.length > 0) {
          const generatedImages = [];

          for (const file of files) {
            if (file.mediaType.startsWith('image/')) {
              // file.uint8Array should be available
              const buffer = Buffer.from(file.uint8Array);
              const filename = `ai-gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`;

              const url = await uploadBufferToOss(buffer, filename, file.mediaType);
              generatedImages.push(url);
            }
          }

          if (generatedImages.length > 0) {
            const markdownImages = generatedImages.map(url => `![Generated Image](${url})`).join('\n\n');
            const responseText = `🎨 Image Generated:\n\n${markdownImages}`;

            // Return as a simple stream or just a text response?
            // Helper to simulate stream response for consistency with frontend
            return new Response(responseText, {
              headers: { 'Content-Type': 'text/plain' }
            });
            // However, frontend expects stream format if it uses useChat? 
            // To be safe, let's just return a single chunk stream.

            const stream = new ReadableStream({
              start(controller) {
                controller.enqueue(responseText);
                controller.close();
              }
            });
            return new Response(stream, { headers: { 'Content-Type': 'text/plain' } });
          }
        }

        // If no image generated, return text
        return new Response(result.text, { headers: { 'Content-Type': 'text/plain' } });

      } catch (error: any) {
        console.error('[GOC] Image Gen Error:', error);
        return new Response(`Failed to generate image: ${error.message}`, { status: 500 });
      }
    }

    // Default Streaming Flow
    const toolChoice = mode === 'planner' ? 'required' as const : 'auto' as const;

    const result = streamText({

      model: selectedModel,

      system: systemPrompt,

      messages: processedModelMessages, // Use processed messages

      tools,

      toolChoice,

      stopWhen: stepCountIs(5),

      providerOptions,

      async onFinish(result: any) { // Use 'any' to bypass strict type checking for this callback

        console.log(`[GOC] Request ${requestId} finished. Reason: ${result.finishReason}`);

        if (result.finishReason === 'error' && result.error) {

          console.error(`[GOC] Stream Error for ${requestId}:`, result.error);

        }

      }

    });

    return result.toUIMessageStreamResponse({
      sendReasoning: enableThinking === true,
      headers: {
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error(`[GOC] Error:`, error?.message);
    console.error(`[GOC] Stack:`, error?.stack);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
