"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useStorage, useMutation, useSelf, useOthers, useRoom } from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type CoreMessage } from 'ai';
import { SharedMessage, AIMode, AIProvider } from "./types";

// Mock function for context summary - can be replaced with real AI call later
const generateContextSummary = async (messages: any[]): Promise<string> => {
  return "Context summary: [Previous conversation archived]";
};

export function useGocChat() {
  const room = useRoom();
  const roomId = room.id;
  const notes = useStorage((root) => root.notes);
  const sharedMessages = useStorage((root) => root.messages) as SharedMessage[] | null;
  const aiPending = useStorage((root) => (root as any).aiPending) as boolean | undefined;
  const aiPendingAt = useStorage((root) => (root as any).aiPendingAt) as number | null | undefined;
  const aiConfig = useStorage((root) => root.aiConfig);
  const me = useSelf();
  const others = useOthers();

  // --- Liveblocks Mutations for AI Config ---
  const updateAiConfig = useMutation(({ storage }, newConfig: Partial<typeof aiConfig>) => {
    const currentConfig = storage.get('aiConfig');
    if (currentConfig) {
      currentConfig.update(newConfig);
    }
  }, []);

  // Initialize AI config if it doesn't exist (only first user does this)
  useEffect(() => {
    if (me && !aiConfig?.controllerId) {
      console.log(`[AI Config] I am the first user. Initializing AI config.`);
      updateAiConfig({
        provider: 'deepseek',
        modelId: 'deepseek-chat',
        aiMode: 'encyclopedia',
        thinkingEnabled: true,
        controllerId: me.id,
      });
    }
  }, [me, aiConfig?.controllerId, updateAiConfig]);

  useEffect(() => {
    const validModes = new Set<AIMode>(['encyclopedia', 'game', 'casual']);
    if (aiConfig?.aiMode && !validModes.has(aiConfig.aiMode)) {
      updateAiConfig({ aiMode: 'encyclopedia' });
    }
  }, [aiConfig?.aiMode, updateAiConfig]);


  // --- Local State ---
  const [lastSentNotes, setLastSentNotes] = useState<string>("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Local Message Timestamps mapping for stability
  const localMessageTimes = useRef<Map<string, number>>(new Map());

  // --- Liveblocks Sync Logic ---
  const syncMessageToLiveblocks = useMutation(
    ({ storage }, message: SharedMessage) => {
      let messages = storage.get("messages");
      if (!messages) {
        messages = new LiveList([]);
        storage.set("messages", messages);
      }
      const arr = (messages as any).toArray();
      const existingIndex = arr.findIndex((m: any) => m.id === message.id);
      if (existingIndex === -1) {
        (messages as any).push(message);
      } else {
        (messages as any).set(existingIndex, message);
      }
    },
    []
  );

  const syncPlayerMessage = useMutation(
    ({ storage }, message: SharedMessage) => {
      let messages = storage.get("messages");
      if (!messages) {
        messages = new LiveList([]);
        storage.set("messages", messages);
      }
      (messages as any).push(message);
    },
    []
  );

  const deleteMessage = useMutation(
    ({ storage }, messageId: string) => {
      const messages = storage.get("messages");
      if (!messages) return;
      
      const arr = (messages as any).toArray();
      const index = arr.findIndex((m: any) => m.id === messageId);
      if (index !== -1) {
        (messages as any).delete(index);
      }
    },
    []
  );

  const setAiPending = useMutation(({ storage }, pending: boolean, timestamp?: number | null) => {
    const current = (storage as any).get("aiPending");
    if (current !== pending) {
      (storage as any).set("aiPending", pending);
    }
    if (typeof timestamp !== 'undefined') {
      (storage as any).set("aiPendingAt", timestamp);
    }
  }, []);

  // --- AI SDK Setup ---
  const chatTransport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat/goc',
  }), []);

  const { messages, sendMessage, status } = useChat({
    id: roomId,
    transport: chatTransport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // --- Streaming Sync Effect ---
  const lastSyncTime = useRef<number>(0);
  const lastSyncedLength = useRef<Map<string, number>>(new Map());
  const syncedMessageIds = useRef<Set<string>>(new Set());
  const SYNC_INTERVAL = 500;

  // Helper to extract text content
  const getUIMessageContent = (uiMessage: any): string => {
    if (typeof uiMessage.content === 'string') return uiMessage.content;
    if (!uiMessage.parts) return "";
    return uiMessage.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('\n\n');
  };

  useEffect(() => {
    if (messages.length === 0) return;

    const now = Date.now();
    const isStreaming = status === 'streaming';

    if (isStreaming && now - lastSyncTime.current < SYNC_INTERVAL) {
      return;
    }

    messages.forEach((msg: any) => {
      const content = getUIMessageContent(msg);
      const contentLength = content?.length || 0;
      const lastLength = lastSyncedLength.current.get(msg.id) || 0;

      const attachments = (msg.attachments || msg.experimental_attachments) || [];
      const hasContent = (content && contentLength > 0) || (attachments.length > 0);

      if (!hasContent) return;

      const shouldSync = isStreaming
        ? contentLength > lastLength + 50
        : !syncedMessageIds.current.has(msg.id) || (contentLength > lastLength) || (attachments.length > 0 && !syncedMessageIds.current.has(msg.id));

      if (shouldSync) {
        // Extract reasoning and tool calls
        let reasoning = '';
        const toolCalls = msg.parts
          ?.filter((p: any) => {
            if (p.type === 'reasoning') {
              reasoning += p.text || '';
              return false; // Don't include reasoning parts in toolCalls array
            }
            return p.type?.startsWith('tool-');
          })
          .map((p: any) => ({
            toolName: p.type?.replace('tool-', '') || 'unknown',
            state: p.state || 'output-available',
            toolCallId: p.toolCallId,
          })) || [];

        const clientMsgId = (msg as any).clientMsgId || (msg as any).id;
        syncMessageToLiveblocks({
          id: msg.id,
          clientMsgId,
          role: msg.role as 'user' | 'assistant',
          content,
          reasoning: reasoning || undefined,
          userName: msg.role === 'user' ? (me?.info?.name || '用户') : '中枢',
          createdAt: msg.createdAt instanceof Date ? msg.createdAt.getTime() : (msg.createdAt || Date.now()),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          attachments: (msg.attachments || msg.experimental_attachments)?.map((a: any) => typeof a === 'string' ? a : a.url),
        });

        lastSyncedLength.current.set(msg.id, contentLength + (reasoning?.length || 0));
        if (!isStreaming) {
          syncedMessageIds.current.add(msg.id);
        }
      }
    });

    lastSyncTime.current = now;
  }, [messages, status, me?.info?.name, syncMessageToLiveblocks]);

  // --- Display Messages Logic ---
  const displayMessages = useMemo(() => {
    const localIds = new Set(messages.map((m: any) => m.id));
    const sharedOnly = (sharedMessages || []).filter((m: any) => !localIds.has(m.id));

    const now = Date.now();
    const allMessages = [
      ...messages.map((m: any, idx: number) => {
        if (!localMessageTimes.current.has(m.id)) {
          localMessageTimes.current.set(m.id, m.createdAt instanceof Date ? m.createdAt.getTime() : (m.createdAt || (now - (messages.length - idx) * 10)));
        }
        return {
          ...m,
          createdAt: localMessageTimes.current.get(m.id),
          _isLocal: true,
        };
      }),
      ...sharedOnly.map((m: any) => ({
        ...m,
        createdAt: typeof m.createdAt === 'number' ? m.createdAt : (m.createdAt instanceof Date ? m.createdAt.getTime() : now),
        _isLocal: false
      })),
    ];

    // 去重优先：clientMsgId > id
    const uniqueMessages = new Map<string, any>();
    allMessages.forEach((m: any) => {
      const key = m.clientMsgId || m.id;
      if (!uniqueMessages.has(key)) {
        uniqueMessages.set(key, m);
      }
    });

    return Array.from(uniqueMessages.values()).sort((a: any, b: any) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      if (aTime !== bTime) return aTime - bTime;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [messages, sharedMessages]);

  const [isCompressing, setIsCompressing] = useState(false);
  const isAiConfigured = !!(aiConfig?.modelId && aiConfig?.provider);
  const [aiModeEnabled, setAiModeEnabled] = useState(isAiConfigured);

  useEffect(() => {
    if (!isAiConfigured) {
      setAiModeEnabled(false);
    }
  }, [isAiConfigured]);

  useEffect(() => {
    if (aiPending && status !== 'streaming' && status !== 'submitted') {
      setAiPending(false, null);
    }
  }, [aiPending, status, setAiPending]);

  useEffect(() => {
    if (!aiPending || !aiPendingAt) return;

    const getTime = (t: any) => {
      if (!t) return 0;
      if (t instanceof Date) return t.getTime();
      if (typeof t === 'number') return t;
      return 0;
    };

    const sharedLatest = (sharedMessages || [])
      .filter((m: any) => m.role === 'assistant')
      .reduce((max, m: any) => Math.max(max, getTime(m.createdAt)), 0);

    const localLatest = messages
      .filter((m: any) => m.role === 'assistant')
      .reduce((max, m: any) => Math.max(max, getTime(m.createdAt)), 0);

    const latest = Math.max(sharedLatest, localLatest);
    if (latest >= aiPendingAt) {
      setAiPending(false, null);
    }
  }, [aiPending, aiPendingAt, sharedMessages, messages, setAiPending]);

  useEffect(() => {
    if (!aiPending) return;
    if (status !== 'streaming') return;

    const hasStreamingAssistant = messages.some((m: any) => {
      if (m.role !== 'assistant') return false;
      if (typeof m.content === 'string' && m.content.length > 0) return true;
      if (Array.isArray(m.parts)) {
        return m.parts.some((p: any) => p?.type === 'text' && typeof p?.text === 'string' && p.text.length > 0);
      }
      return false;
    });

    if (hasStreamingAssistant) {
      setAiPending(false, null);
    }
  }, [aiPending, status, messages, setAiPending]);

  useEffect(() => {
    if (aiPending && status !== 'streaming' && status !== 'submitted') {
      setAiPending(false);
    }
  }, [aiPending, status, setAiPending]);

  // --- Send Message Handler ---
  const handleSendMessage = async (text: string, attachments: string[] = []) => {
    if (!text.trim() && attachments.length === 0) return;

    // --- Context Management Strategy (CRITICAL FIX) ---
    // Instead of using local 'messages' (which might be empty on refresh),
    // we use 'displayMessages' which is the union of local and shared history.
    // This ensures the AI sees the entire room's conversation and previous images.
    const historyForAI = displayMessages.map((m: any) => {
      const rawAttachments = m.attachments || m.experimental_attachments;
      const msg: any = {
        role: m.role,
        content: m.content || "",
      };

      if (rawAttachments && rawAttachments.length > 0) {
        msg.experimental_attachments = rawAttachments.map((a: any) => {
          const url = typeof a === 'string' ? a : a.url;
          return {
            url,
            contentType: 'image/webp',
            name: 'image.webp'
          };
        });
      }
      return msg;
    });

    // Simple Truncation/Compression for Context
    const MAX_CONTEXT = 30;
    let finalHistory = historyForAI;
    if (finalHistory.length > MAX_CONTEXT) {
      finalHistory = [
        { role: 'system', content: `[System]: Room history truncated.` },
        ...finalHistory.slice(-15)
      ];
    }

    const trimmedInput = text.trim();
    const hasAIPrefix = trimmedInput.startsWith('@AI') || trimmedInput.startsWith('@ai');
    const shouldSendToAI = (aiModeEnabled && isAiConfigured) || hasAIPrefix;

    // 如果要发给 AI，但 AI 正在处理中，则阻止发送
    if (shouldSendToAI && isLoading) {
      return;
    }

    const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (!shouldSendToAI) {
      const playerMsg: SharedMessage = {
        id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        clientMsgId,
        role: 'user',
        content: trimmedInput,
        userName: me?.info?.name || '用户',
        createdAt: Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };
      syncPlayerMessage(playerMsg);
      return;
    }

    const aiQuery = hasAIPrefix ? trimmedInput.replace(/^@ai\s*/i, '') : trimmedInput;
    if (!aiQuery && attachments.length === 0) {
      return;
    }

    const playerList = [
      { id: me?.id, name: me?.info?.name },
      ...others.map(u => ({ id: u.id, name: u.info?.name }))
    ];

    const hasNotesChanged = notes !== lastSentNotes;

    const body: any = {
      players: playerList,
      mode: aiConfig?.aiMode,
      provider: aiConfig?.provider,
      modelId: aiConfig?.modelId,
      roomId: roomId,
      currentPlayerName: me?.info?.name || '未知',
      enableThinking: aiConfig?.thinkingEnabled,
    };

    if (hasNotesChanged) {
      body.notes = notes;
      setLastSentNotes(notes as string);
    }

    setAiPending(true, Date.now());

    // Per Vercel AI SDK Docs, the 'messages' option should be part of the initial `useChat` call,
    // not `sendMessage`. `sendMessage`'s second argument is for `data`.
    // We are dynamically compressing, so we need to set the messages manually before sending.
    // However, the `useChat` hook doesn't expose a `setMessages` function to do this directly before a call.
    // The workaround is to pass the compressed history in the `data` payload and handle it on the server-side.
    // This avoids TypeScript errors and aligns with the intended use of the SDK.

    // Construct newUserMsg using standard 'content' array format for better compatibility
    let newUserMsg: any = {
      id: clientMsgId,
      clientMsgId,
      role: 'user',
      content: aiQuery,
    };

    if (attachments && attachments.length > 0) {
      const contentParts: any[] = [
        { type: 'text', text: aiQuery }
      ];

      attachments.forEach(url => {
        contentParts.push({
          type: 'image',
          image: new URL(url) // SDK expects URL object or string. URL object is safer to trigger 'image' type detection
        });
      });

      newUserMsg.content = contentParts;

      // Also keep experimental_attachments for legacy/fallback support if needed by other components
      newUserMsg.experimental_attachments = attachments.map(url => ({
        url,
        contentType: 'image/webp',
        name: 'image.webp'
      }));
    }

    // --- CRITICAL FIX: Ensure user's own message (with images) is synced to Liveblocks ---
    syncPlayerMessage({
      id: `ai-input-${Date.now()}`,
      clientMsgId,
      role: 'user',
      content: aiQuery,
      userName: me?.info?.name || '用户',
      createdAt: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    body.messages = [...finalHistory, newUserMsg];

    // We no longer need to pass attachments separately if we embedded them in the message
    // body.attachments = attachments;

    // AI SDK 5.x 标准多模态格式
    // 参考: https://github.com/vercel/ai/blob/main/content/docs/02-foundations/03-prompts.mdx
    const messagePayload: any = {
      id: clientMsgId,
      role: 'user',
      content: aiQuery, // 默认纯文本
    };

    // 如果有图片，构造 content 数组
    if (attachments && attachments.length > 0) {
      const contentParts: any[] = [
        { type: 'text', text: aiQuery }
      ];

      // 添加图片部分 - 直接使用 URL 字符串
      attachments.forEach(url => {
        contentParts.push({
          type: 'image',
          image: url  // SDK 5.x 支持直接用字符串 URL
        });
      });

      messagePayload.content = contentParts;
    }

    sendMessage(messagePayload, { body });
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage(messageId);
  };

  return {
    // State
    displayMessages,
    status,
    isLoading: isLoading || isCompressing, // Combine loading states
    isCompressing,
    inputRef,
    me,
    others,
    sharedMessages,
    aiPending: !!aiPending,

    // Unified AI Config from Liveblocks
    aiConfig,
    updateAiConfig,
    aiModeEnabled,
    setAiModeEnabled,

    // Actions
    handleSendMessage,
    handleDeleteMessage,
    getUIMessageContent,
  };
}
