import { createGoogleGenerativeAI, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from "@/lib/env";

const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
const proxyConfig: any = {};

if (!isProduction) {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:10809';
  proxyConfig.httpAgent = proxyUrl;
  proxyConfig.httpsAgent = proxyUrl;
}

// 初始化 Providers
// 懒加载 Providers 避免构建时环境变量验证失败
let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | undefined;
let customGeminiProvider: ReturnType<typeof createOpenAI> | undefined;
let deepseekProvider: ReturnType<typeof createDeepSeek> | undefined;

function getGoogleProvider() {
  if (!googleProvider) {
    googleProvider = createGoogleGenerativeAI({
      apiKey: env.GOOGLE_AI_STUDIO_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY,
      ...proxyConfig,
      fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }),
    });
  }
  return googleProvider;
}

function getCustomGeminiProvider() {
  if (!customGeminiProvider) {
    if (env.GEMINI_BASE_URL) {
      console.log(`[GeminiProxy] Using custom OpenAI-compatible proxy: ${env.GEMINI_BASE_URL}`);
    }
    customGeminiProvider = createOpenAI({
      apiKey: env.GEMINI_PROXY_API_KEY || process.env.GEMINI_PROXY_API_KEY || 'sk-placeholder',
      // @ts-ignore - 强制启用兼容模式，解决反代格式不标准导致的验证错误
      compatibility: 'compatible',
    });
  }
  return customGeminiProvider;
}

function getDeepSeekProvider() {
  if (!deepseekProvider) {
    deepseekProvider = createDeepSeek({
      apiKey: env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY,
      ...proxyConfig,
    });
  }
  return deepseekProvider;
}

export function getAIModel({ provider, modelId, enableThinking }: { provider: string, modelId?: string, enableThinking?: boolean }) {
  const effectiveModelId = modelId || (provider === 'gemini' ? 'gemini-2.0-flash-exp' : 'deepseek-chat');
  let model: any;
  let providerOptions: any = {};

  if (provider === 'gemini') {
    console.log(`[AI Provider] Gemini model requested: ${effectiveModelId}`);

    // 路由逻辑:
    // - gemini-2.5-flash / gemini-2.0-flash-exp -> 官方 Google 通道 (保留原样)
    // - gemini-3-* (及其他) -> 自定义反代通道 (OpenAI 协议)
    const useOfficialProvider = effectiveModelId.includes('gemini-2.5') || effectiveModelId.includes('gemini-2.0');

    console.log(`[AI Provider] Using ${useOfficialProvider ? 'Official Google' : 'Custom Proxy'} provider`);

    if (useOfficialProvider) {
      model = getGoogleProvider()(effectiveModelId);

      // 官方通道的思考配置
      if (enableThinking) {
        const thinkingConfig: any = { includeThoughts: true };
        if (effectiveModelId === 'gemini-2.5-flash') {
          thinkingConfig.thinkingBudget = 8192;
        }
        providerOptions = {
          google: { thinkingConfig } satisfies GoogleGenerativeAIProviderOptions,
        };
      }
    } else {
      // 走自定义代理
      console.log(`[Gemini] Routing ${effectiveModelId} via Custom Proxy`);
      model = getCustomGeminiProvider()(effectiveModelId);
      // OpenAI 协议通常通过 standard headers 或 params 传递思考配置，
      // 但对于 Gemini 反代，通常取决于代理实现。由于 @ai-sdk/openai 不支持 google specific options，
      // 这里暂不传 providerOptions，除非代理支持特定的 OpenAI extension。
    }
  } else if (provider === 'deepseek') {
    model = getDeepSeekProvider()(effectiveModelId);
  } else {
    model = getDeepSeekProvider()('deepseek-chat');
  }

  return { model, providerOptions };
}
