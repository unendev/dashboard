/**
 * AI 配置管理
 * 支持多种 AI 提供商：DeepSeek, Gemini, Custom
 * 每个提供商的配置独立保存
 */

export interface AIConfig {
  provider: 'deepseek' | 'gemini' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

/**
 * AI 角色定义
 */
export interface AIRole {
  id: string;
  name: string;
  systemPrompt: string;
}

const ROLES_STORAGE_KEY = 'webread-ai-roles';
const BOOK_ROLE_PREFIX = 'webread-book-role-';

// 默认角色
const DEFAULT_ROLES: AIRole[] = [
  {
    id: 'default',
    name: '默认助手',
    systemPrompt: '你是一位博学的阅读助手。请简洁地解释选中文字的含义、背景知识或相关概念。如果是外语，请翻译并解释。回答要简洁有深度，不超过200字。',
  },
  {
    id: 'translator',
    name: '翻译官',
    systemPrompt: '你是一位专业翻译。请将选中的文字翻译成中文（如果是中文则翻译成英文），并简要解释关键词汇或表达方式。',
  },
  {
    id: 'teacher',
    name: '老师',
    systemPrompt: '你是一位耐心的老师。请用通俗易懂的方式解释选中的内容，可以举例说明，帮助读者深入理解。',
  },
];

const DEFAULT_CONFIGS: Record<string, AIConfig> = {
  deepseek: {
    provider: 'deepseek',
    apiKey: '',
    baseUrl: '',
    model: 'deepseek-chat',
    enabled: true,
  },
  gemini: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-2.5-flash',
    enabled: true,
  },
  custom: {
    provider: 'custom',
    apiKey: '',
    baseUrl: '',
    model: 'custom',
    enabled: true,
  },
};

const STORAGE_PREFIX = 'webread-ai-config-';
const PROVIDER_KEY = 'webread-ai-provider';

/**
 * 获取存储键
 */
function getStorageKey(provider: string): string {
  return `${STORAGE_PREFIX}${provider}`;
}

/**
 * 获取当前选中的提供商
 */
function getCurrentProvider(): 'deepseek' | 'gemini' | 'custom' {
  if (typeof window === 'undefined') return 'deepseek';
  
  try {
    const provider = localStorage.getItem(PROVIDER_KEY);
    if (provider && ['deepseek', 'gemini', 'custom'].includes(provider)) {
      return provider as 'deepseek' | 'gemini' | 'custom';
    }
  } catch (e) {
    console.error('[AIConfig] Failed to load provider:', e);
  }
  
  return 'deepseek';
}

/**
 * 获取 AI 配置（当前选中的 provider）
 */
export function getAIConfig(): AIConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIGS.deepseek;
  }
  
  try {
    const provider = getCurrentProvider();
    const storageKey = getStorageKey(provider);
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      return { ...DEFAULT_CONFIGS[provider], ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('[AIConfig] Failed to load config:', e);
  }
  
  const provider = getCurrentProvider();
  return DEFAULT_CONFIGS[provider];
}

/**
 * 获取指定 provider 的配置（用于切换 provider 时加载已保存的配置）
 */
export function getProviderConfig(provider: AIConfig['provider']): AIConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIGS[provider];
  }
  
  try {
    const storageKey = getStorageKey(provider);
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      return { ...DEFAULT_CONFIGS[provider], ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('[AIConfig] Failed to load provider config:', e);
  }
  
  return DEFAULT_CONFIGS[provider];
}

/**
 * 保存 AI 配置
 */
export function setAIConfig(config: Partial<AIConfig>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const provider = config.provider || getCurrentProvider();
    const current = getAIConfig();
    const newConfig = { ...current, ...config, provider };
    
    // 保存该提供商的配置
    const storageKey = getStorageKey(provider);
    localStorage.setItem(storageKey, JSON.stringify(newConfig));
    
    // 保存当前选中的提供商
    localStorage.setItem(PROVIDER_KEY, provider);
    
    console.log('[AIConfig] Config saved:', provider, newConfig.model);
  } catch (e) {
    console.error('[AIConfig] Failed to save config:', e);
  }
}

/**
 * 获取提供商的默认模型列表
 */
export function getProviderModels(provider: AIConfig['provider']): { id: string; name: string }[] {
  switch (provider) {
    case 'deepseek':
      return [
        { id: 'deepseek-chat', name: 'DeepSeek Chat' },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1 (推理)' },
      ];
    case 'gemini':
      return [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' },
      ];
    case 'custom':
      return [
        { id: 'custom', name: '自定义模型' },
      ];
    default:
      return [];
  }
}

/**
 * 获取提供商的默认 Base URL
 * 注意：Gemini 不需要 baseUrl，使用 SDK 默认值
 */
export function getProviderBaseUrl(provider: AIConfig['provider']): string {
  switch (provider) {
    case 'deepseek':
      return 'https://api.deepseek.com/v1';
    case 'gemini':
      return ''; // Gemini 使用 SDK 默认值，不需要设置
    case 'custom':
      return '';
    default:
      return '';
  }
}


/**
 * 获取所有角色
 */
export function getAIRoles(): AIRole[] {
  if (typeof window === 'undefined') return DEFAULT_ROLES;
  
  try {
    const stored = localStorage.getItem(ROLES_STORAGE_KEY);
    if (stored) {
      const roles = JSON.parse(stored);
      return roles.length > 0 ? roles : DEFAULT_ROLES;
    }
  } catch (e) {
    console.error('[AIConfig] Failed to load roles:', e);
  }
  
  return DEFAULT_ROLES;
}

/**
 * 保存角色列表
 */
export function setAIRoles(roles: AIRole[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  } catch (e) {
    console.error('[AIConfig] Failed to save roles:', e);
  }
}

/**
 * 获取书籍的选中角色
 */
export function getBookRole(bookId: string): string {
  if (typeof window === 'undefined') return 'default';
  
  try {
    return localStorage.getItem(`${BOOK_ROLE_PREFIX}${bookId}`) || 'default';
  } catch (e) {
    return 'default';
  }
}

/**
 * 设置书籍的选中角色
 */
export function setBookRole(bookId: string, roleId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`${BOOK_ROLE_PREFIX}${bookId}`, roleId);
  } catch (e) {
    console.error('[AIConfig] Failed to save book role:', e);
  }
}
