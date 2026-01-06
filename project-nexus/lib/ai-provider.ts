import { createGoogleGenerativeAI, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { env } from "@/lib/env";

const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
const proxyConfig: any = {};

if (!isProduction) {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:10809';
  proxyConfig.httpAgent = proxyUrl;
  proxyConfig.httpsAgent = proxyUrl;
}

// 初始化 Providers
const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_AI_STUDIO_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY,
  ...proxyConfig,
  fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }),
});

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  ...proxyConfig,
});

export function getAIModel({ provider, modelId, enableThinking }: { provider: string, modelId?: string, enableThinking?: boolean }) {
  const effectiveModelId = modelId || (provider === 'gemini' ? 'gemini-2.5-flash' : 'deepseek-chat');
  let model: any;
  let providerOptions: any = {};

  if (provider === 'gemini') {
    model = google(effectiveModelId);
    if (enableThinking && (effectiveModelId.includes('gemini-3') || effectiveModelId.includes('gemini-2.5'))) {
      const thinkingConfig: any = { includeThoughts: true };
      if (effectiveModelId.includes('gemini-3')) {
        thinkingConfig.thinkingLevel = 'high';
      } else if (effectiveModelId === 'gemini-2.5-flash') {
        thinkingConfig.thinkingBudget = 8192;
      }
      providerOptions = {
        google: { thinkingConfig } satisfies GoogleGenerativeAIProviderOptions,
      };
    }
  } else if (provider === 'deepseek') {
    model = deepseek(effectiveModelId);
  } else {
    model = deepseek('deepseek-chat');
  }

  return { model, providerOptions };
}
