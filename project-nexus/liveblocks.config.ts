import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Example, real-time cursor coordinates
      // cursor: { x: number; y: number } | null;
    };

    // The Storage tree for the room, for useStorage, useMutation, etc.
    Storage: {
      // GOC AI Config: Centralized AI model settings for the room
      aiConfig: LiveObject<{
        provider: 'gemini' | 'deepseek' | string;
        modelId: string;
        aiMode: 'encyclopedia' | 'advisor' | 'interrogator' | 'planner';
        thinkingEnabled: boolean;
        // The user ID of the player who can control the settings
        controllerId?: string; 
      }>;

      todos: LiveList<{
        id: string;
        text: string;
        completed: boolean;
      }>;
      notes: string; // The main shared note
      // User-specific notes: userId -> content string OR { content: string, name: string }
      playerNotes: LiveMap<string, string | { content: string, name: string }>;
      messages: LiveList<{
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        reasoning?: string; // For AI's thought process
        createdAt: number;
        userName?: string;
        userColor?: string;
      }>;
      streamingResponse: {
        id: string;
        role: 'assistant';
        content: string;
        userName: string;
        createdAt: number;
        isComplete: boolean;
      } | null;
      currentUrl: string | null;
      latestIntel: {
        imageUrl: string;
        uploaderId: string;
        uploaderName: string;
        timestamp: number;
      } | null;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: {
      type: 'AI_CHUNK';
      id: string;
      chunk: string;
      userName: string;
      createdAt: number;
      userColor?: string;
    } | {
      type: 'TOOL_REQUEST';
      toolName: string;
      args: any;
      executorId: string; // The user ID who triggered this (should execute the mutation)
      runId: string; // Unique ID for this tool call
    };

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      // resolved: boolean;
      // quote: string;
      // time: number;
    };

    // Custom metadata set on activities, for useActivities, useCreateActivity, etc.
    ActivityData: {
      // cta: string;
    };
  }
}

export { };
