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
let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | undefined;
let customGeminiProxyProvider: ReturnType<typeof createOpenAI> | undefined;
let customGoogleNativeProvider: ReturnType<typeof createGoogleGenerativeAI> | undefined;
let nexusFeedGeminiProvider: ReturnType<typeof createOpenAI> | undefined;
let deepseekProvider: ReturnType<typeof createDeepSeek> | undefined;

function getGoogleProvider() {
  if (!googleProvider) {
    googleProvider = createGoogleGenerativeAI({
      apiKey: env.GOOGLE_AI_STUDIO_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY,
      ...proxyConfig,
      fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(300000) }),
    });
  }
  return googleProvider;
}

function getOpenAICompatibleGeminiProvider() {
  if (!customGeminiProxyProvider) {
    // 处理 base URL：确保以 /v1 结尾 (OpenAI SDK 会自动追加 /chat/completions)
    let baseUrl = env.GEMINI_BASE_URL || 'https://api.unendev.com/v1';

    // 如果没有 /v1 且没有 /v1beta (防止把 google url 传进来)，追加 /v1
    if (!baseUrl.endsWith('/v1') && !baseUrl.includes('v1beta')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/v1';
    }

    console.log(`[GeminiProxy] Using OpenAI-compatible protocol: ${baseUrl}`);

    customGeminiProxyProvider = createOpenAI({
      apiKey: env.GEMINI_PROXY_API_KEY || process.env.GEMINI_PROXY_API_KEY || 'sk-placeholder',
      baseURL: baseUrl,
    });
  }
  return customGeminiProxyProvider;
}

function getCustomGoogleNativeProvider() {
  if (!customGoogleNativeProvider) {
    let baseUrl = env.GEMINI_BASE_URL || 'https://api.unendev.com/v1';

    // 转换逻辑：将 /v1 (OpenAI style) 转换为 /v1beta (Google style)
    if (baseUrl.endsWith('/v1')) {
      baseUrl = baseUrl.replace(/\/v1$/, ''); // Remove /v1 -> https://api.unendev.com
    }

    // 确保以 /v1beta 结尾 (诊断证实这是必须的)
    if (!baseUrl.endsWith('/v1beta')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/v1beta';
    }

    console.log(`[GeminiProxy] Using Google Native protocol: ${baseUrl}`);

    customGoogleNativeProvider = createGoogleGenerativeAI({
      apiKey: env.GEMINI_PROXY_API_KEY || process.env.GEMINI_PROXY_API_KEY || '',
      baseURL: baseUrl,
      ...proxyConfig,
      fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(300000) }),
    });
  }
  return customGoogleNativeProvider;
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

/**
 * Nexus Feed 专用 Gemini 链路（与 GOC 可区分）
 * - 固定走 OpenAI-compatible 代理
 * - 固定默认 baseURL 为 https://api.unendev.com/v1
 */
function getNexusFeedGeminiProvider() {
  if (!nexusFeedGeminiProvider) {
    const baseUrl = 'https://api.unendev.com/v1';
    console.log(`[NexusFeed Gemini] Using dedicated provider: ${baseUrl}`);

    nexusFeedGeminiProvider = createOpenAI({
      apiKey: env.GEMINI_PROXY_API_KEY || process.env.GEMINI_PROXY_API_KEY || 'sk-placeholder',
      baseURL: baseUrl,
    });
  }

  return nexusFeedGeminiProvider;
}

export function getAIModel({ provider, modelId, enableThinking }: { provider: string, modelId?: string, enableThinking?: boolean }) {
  const effectiveModelId = modelId || (provider === 'gemini' ? 'gemini-2.0-flash-exp' : 'deepseek-chat');
  let model: any;
  let providerOptions: any = {};

  if (provider === 'gemini-nexus-feed') {
    // 主路由信息页（Nexus Feed）默认链路：api.unendev.com + Gemini 2.0 Flash
    // 保持与 GOC 的 provider 选择可区分，避免误伤 GOC 默认行为。
    console.log(`[AI Provider] Routing to Nexus Feed dedicated Gemini proxy: ${effectiveModelId}`);
    model = getNexusFeedGeminiProvider()(effectiveModelId || 'gemini-2.0-flash-exp');
  } else if (provider === 'gemini') {
    console.log(`[AI Provider] Gemini model requested: ${effectiveModelId}`);

    // 路由逻辑:
    // 1. 官方通道: 包含 2.5 或 2.0 的模型 (如果需要保持官方 key 优先)
    // 2. Google Native 反代: gemini-3-* (诊断证实必须走 Google Native /v1beta)
    // 3. OpenAI 兼容反代: 其他旧模型或默认 fallback

    const useOfficialProvider = effectiveModelId.includes('gemini-2.5') || effectiveModelId.includes('gemini-2.0');
    // 根据用户需求，gemini-3 系列必须走自定义 URL 且使用 Google 协议 (诊断)
    const useGoogleNativeProxy = effectiveModelId.startsWith('gemini-3');

    if (useOfficialProvider) {
      // 官方 Google 通道 (需要 GOOGLE_AI_STUDIO_API_KEY)
      console.log(`[AI Provider] Routing to Official Google Provider`);
      model = getGoogleProvider()(effectiveModelId);

      // 官方 Thinking 配置
      if (enableThinking) {
        const thinkingConfig: any = { includeThoughts: true };
        if (effectiveModelId === 'gemini-2.5-flash') {
          thinkingConfig.thinkingBudget = 8192;
        }
        providerOptions = {
          google: { thinkingConfig } satisfies GoogleGenerativeAIProviderOptions,
        };
      }

    } else if (useGoogleNativeProxy) {
      // Gemini 3 + 自定义 URL -> Google Native Proxy
      console.log(`[AI Provider] Routing to Custom Google Native Proxy`);
      model = getCustomGoogleNativeProvider()(effectiveModelId);

      // Google 协议支持 Thinking (如果是 gemini-3 且支持的话)
      if (enableThinking) {
        providerOptions = {
          google: { thinkingConfig: { includeThoughts: true } } satisfies GoogleGenerativeAIProviderOptions,
        };
      }

    } else {
      // 其他模型 -> OpenAI 兼容反代
      console.log(`[AI Provider] Routing to Custom OpenAI Compatible Proxy`);
      model = getOpenAICompatibleGeminiProvider()(effectiveModelId);
    }

  } else if (provider === 'deepseek') {
    model = getDeepSeekProvider()(effectiveModelId);
  } else {
    model = getDeepSeekProvider()('deepseek-chat');
  }

  return { model, providerOptions };
}
