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


  // --- Local State ---
  const [lastSentNotes, setLastSentNotes] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  
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
      
      if (!content || contentLength === 0) return;
      
      const shouldSync = isStreaming 
        ? contentLength > lastLength + 50 
        : !syncedMessageIds.current.has(msg.id) || contentLength > lastLength;
      
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
        
        syncMessageToLiveblocks({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content,
          reasoning: reasoning || undefined,
          userName: msg.role === 'user' ? (me?.info?.name || 'Operator') : 'NEXUS AI',
          createdAt: msg.createdAt instanceof Date ? msg.createdAt.getTime() : (msg.createdAt || Date.now()),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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
    
    return allMessages.sort((a: any, b: any) => {
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
  
  // --- Send Message Handler ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const inputValue = inputRef.current?.value || '';
    if (!inputValue.trim() || isLoading) return;

    // --- Context Management Strategy ---
    const MAX_MESSAGES_BEFORE_COMPRESSION = 20;
    const RECENT_MESSAGES_TO_KEEP = 10;
    
    // Explicitly cast to any to bypass strict type checking for mixed message types during processing
    // In a real scenario, we should normalize CoreMessage to UIMessage
    let processedMessages: any[] = messages;

    if (messages.length > MAX_MESSAGES_BEFORE_COMPRESSION) {
      try {
        setIsCompressing(true);
        console.log(`[Chat Context] History too long (${messages.length}). Compressing...`);
        
        const systemMessage = messages.find(m => m.role === 'system');
        const messagesToSummarize = messages.slice(systemMessage ? 1 : 0, -RECENT_MESSAGES_TO_KEEP);
        const recentMessages = messages.slice(-RECENT_MESSAGES_TO_KEEP);

        // Generate summary from the middle part of the conversation
        const summary = await generateContextSummary(messagesToSummarize);
        
        const summaryMessage = {
          id: `summary-${Date.now()}`,
          role: 'system',
          content: `[Archived Context Summary]:\n${summary}`,
        };
        
        // Reconstruct messages with summary
        processedMessages = systemMessage 
          ? [systemMessage, summaryMessage, ...recentMessages] 
          : [summaryMessage, ...recentMessages];

        console.log(`[Chat Context] Compression complete. New history length: ${processedMessages.length}`);
      } catch (error) {
        console.error("Context compression failed, falling back to truncation.", error);
        // Fallback to simple truncation on error
        const recentMessages = messages.slice(-RECENT_MESSAGES_TO_KEEP);
        const systemMessage = messages.find(m => m.role === 'system');
        processedMessages = systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
      } finally {
        setIsCompressing(false);
      }
    }

    const trimmedInput = inputValue.trim();
    const hasAIPrefix = trimmedInput.startsWith('@AI') || trimmedInput.startsWith('@ai');
    const shouldSendToAI = (aiModeEnabled && isAiConfigured) || hasAIPrefix;
    
    if (!shouldSendToAI) {
      const playerMsg: SharedMessage = {
        id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role: 'user',
        content: trimmedInput,
        userName: me?.info?.name || 'Operator',
        createdAt: Date.now(),
      };
      syncPlayerMessage(playerMsg);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    
    const aiQuery = hasAIPrefix ? trimmedInput.replace(/^@ai\s*/i, '') : trimmedInput;
    if (!aiQuery) {
      if (inputRef.current) inputRef.current.value = '';
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
      currentPlayerName: me?.info?.name || 'Unknown',
      enableThinking: aiConfig?.thinkingEnabled,
    };
    
    if (hasNotesChanged) {
      body.notes = notes;
      setLastSentNotes(notes as string);
    }

    // Per Vercel AI SDK Docs, the 'messages' option should be part of the initial `useChat` call,
    // not `sendMessage`. `sendMessage`'s second argument is for `data`.
    // We are dynamically compressing, so we need to set the messages manually before sending.
    // However, the `useChat` hook doesn't expose a `setMessages` function to do this directly before a call.
    // The workaround is to pass the compressed history in the `data` payload and handle it on the server-side.
    // This avoids TypeScript errors and aligns with the intended use of the SDK.
    
    // Let's add the compressed messages to the body.
    body.messages = processedMessages;
    
    sendMessage({ text: aiQuery }, { body });
    
    if (inputRef.current) inputRef.current.value = '';
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
    
    // Unified AI Config from Liveblocks
    aiConfig,
    updateAiConfig,
    aiModeEnabled,
    setAiModeEnabled,
    
    // Actions
    handleSendMessage,
    getUIMessageContent,
  };
}
