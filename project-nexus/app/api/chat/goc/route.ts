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
    const { messages, players, mode, roomId, provider, modelId, currentPlayerName, enableThinking } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array is required', { status: 400 });
    }

    if (!roomId) {
      return new Response('Room ID is required', { status: 400 });
    }

    const playerContext = players ? players.map((p: any) => `- ${p.name} (ID: ${p.id})`).join('\n') : "Unknown";

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

    const modelMessages = convertToModelMessages(messages);

    // 使用统一的 getAIModel 逻辑
    const { model: selectedModel, providerOptions } = getAIModel({
      provider,
      modelId,
      enableThinking
    });

    console.log(`[GOC] Model initialized: ${provider}/${modelId || 'default'}`);

    const toolChoice = mode === 'planner' ? 'required' as const : 'auto' as const;

    const result = streamText({

      model: selectedModel,

      system: systemPrompt,

      messages: modelMessages,

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
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
