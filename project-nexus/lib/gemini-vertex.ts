/**
 * Vertex Gemini 封装（当前未接入 /room 链路）
 *
 * 说明：
 * - `/room` 当前通过 `app/api/goc-chat/route.ts` 使用 `@ai-sdk/google` + `GOOGLE_API_KEY` 直连 Gemini。
 * - 本文件保留用于未来迁移到 Vertex AI（GCP Project/Location/Service Account）时复用。
 */
import { VertexAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

// --- Configuration ---
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

// 代理配置（仅本地开发使用）
const vertexAIConfig: any = { 
  project: PROJECT_ID || 'project-nexus', 
  location: LOCATION 
};

if (!isProduction) {
  // 本地开发环境：配置代理走 SOCKS 10809
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:10809';
  vertexAIConfig.httpAgent = proxyUrl;
  vertexAIConfig.httpsAgent = proxyUrl;
}

// Initialize Vertex AI
const vertex_ai = new VertexAI(vertexAIConfig);

// Model Constants
export const GEMINI_MODELS = {
  FLASH_2_5: 'gemini-2.0-flash-exp', // Using 2.0 Flash Exp as 2.5 placeholder if needed, or actual ID if available
  PRO_2_5: 'gemini-2.0-pro-exp',   // Placeholder
  PRO_3_0: 'gemini-3.0-pro-exp',   // Placeholder
} as const;

export type GeminiModelId = keyof typeof GEMINI_MODELS;

// Helper to get model instance
export function getGeminiModel(modelId: string = 'gemini-2.0-flash-exp'): GenerativeModel {
  return vertex_ai.getGenerativeModel({
    model: modelId,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.5,
      topP: 0.95,
    },
  });
}

// Helper to convert Vercel AI SDK messages to Vertex AI Content format
export function convertMessagesToVertex(messages: any[]) {
  return messages.map((m) => {
    let role = 'user';
    if (m.role === 'assistant') role = 'model';
    if (m.role === 'system') return null; // Vertex AI handles system instructions separately

    // Handle text content
    const parts = [{ text: m.content }];
    
    return {
      role,
      parts,
    };
  }).filter(Boolean); // Remove nulls (system messages)
}

// Extract system instruction from messages
export function extractSystemInstruction(messages: any[]): string | undefined {
  const systemMessage = messages.find(m => m.role === 'system');
  return systemMessage ? systemMessage.content : undefined;
}
