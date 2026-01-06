/**
 * Markdown 系统共享设计变量
 * 
 * 定义颜色、字体、间距等设计 token，供渲染系统和编辑系统共同使用
 */

export type ThemeVariant = 'goc' | 'dark' | 'light';

export interface DesignTokens {
  // 文本颜色
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  // 标题颜色
  heading: {
    h1: string;
    h2: string;
    h3: string;
  };
  // 代码
  code: {
    background: string;
    text: string;
    border: string;
  };
  // 引用
  blockquote: {
    border: string;
    background: string;
    text: string;
  };
  // 链接
  link: {
    color: string;
    hoverColor: string;
  };
  // 背景
  background: {
    primary: string;
    secondary: string;
  };
  // 列表
  list: {
    marker: string;
    text: string;
  };
}

/**
 * GOC 主题 - 赛博朋克/战术深色风格（主要主题）
 */
export const gocTokens: DesignTokens = {
  text: {
    primary: '#d4d4d8',      // zinc-300
    secondary: '#a1a1aa',    // zinc-400
    muted: '#71717a',        // zinc-500
  },
  heading: {
    h1: '#22d3ee',           // cyan-400
    h2: '#a5f3fc',           // cyan-200
    h3: 'rgba(207,250,254,0.8)', // cyan-100/80
  },
  code: {
    background: 'rgba(0,0,0,0.5)',
    text: '#67e8f9',         // cyan-300
    border: 'rgba(255,255,255,0.1)',
  },
  blockquote: {
    border: 'rgba(34,211,238,0.5)', // cyan-400/50
    background: 'rgba(255,255,255,0.05)',
    text: '#a1a1aa',         // zinc-400
  },
  link: {
    color: '#22d3ee',        // cyan-400
    hoverColor: '#67e8f9',   // cyan-300
  },
  background: {
    primary: '#18181b',      // zinc-900
    secondary: '#27272a',    // zinc-800
  },
  list: {
    marker: '#67e8f9',       // cyan-300
    text: '#d4d4d8',         // zinc-300
  },
};

/**
 * Dark 主题 - 标准深色风格
 */
export const darkTokens: DesignTokens = {
  text: {
    primary: '#e5e7eb',      // gray-200
    secondary: '#9ca3af',    // gray-400
    muted: '#6b7280',        // gray-500
  },
  heading: {
    h1: '#f9fafb',           // gray-50
    h2: '#f3f4f6',           // gray-100
    h3: '#e5e7eb',           // gray-200
  },
  code: {
    background: '#374151',   // gray-700
    text: '#fbbf24',         // amber-400
    border: '#4b5563',       // gray-600
  },
  blockquote: {
    border: '#3b82f6',       // blue-500
    background: 'rgba(59,130,246,0.1)',
    text: '#9ca3af',         // gray-400
  },
  link: {
    color: '#60a5fa',        // blue-400
    hoverColor: '#93c5fd',   // blue-300
  },
  background: {
    primary: '#111827',      // gray-900
    secondary: '#1f2937',    // gray-800
  },
  list: {
    marker: '#9ca3af',       // gray-400
    text: '#d1d5db',         // gray-300
  },
};

/**
 * Light 主题 - 浅色风格（用于藏宝阁等场景）
 */
export const lightTokens: DesignTokens = {
  text: {
    primary: '#374151',      // gray-700
    secondary: '#6b7280',    // gray-500
    muted: '#9ca3af',        // gray-400
  },
  heading: {
    h1: '#111827',           // gray-900
    h2: '#1f2937',           // gray-800
    h3: '#374151',           // gray-700
  },
  code: {
    background: '#f3f4f6',   // gray-100
    text: '#1f2937',         // gray-800
    border: '#e5e7eb',       // gray-200
  },
  blockquote: {
    border: '#93c5fd',       // blue-300
    background: '#eff6ff',   // blue-50
    text: '#4b5563',         // gray-600
  },
  link: {
    color: '#2563eb',        // blue-600
    hoverColor: '#1d4ed8',   // blue-700
  },
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',    // gray-50
  },
  list: {
    marker: '#6b7280',       // gray-500
    text: '#374151',         // gray-700
  },
};

/**
 * 根据主题变体获取对应的设计 token
 * @param variant 主题变体
 * @returns 设计 token 对象
 */
export function getTokens(variant: ThemeVariant = 'goc'): DesignTokens {
  switch (variant) {
    case 'goc':
      return gocTokens;
    case 'dark':
      return darkTokens;
    case 'light':
      return lightTokens;
    default:
      console.warn(`Unknown theme variant: ${variant}, falling back to 'goc'`);
      return gocTokens;
  }
}

/**
 * 检查 token 对象是否完整
 * @param tokens 设计 token 对象
 * @returns 是否所有必需字段都存在且非空
 */
export function isTokensComplete(tokens: DesignTokens): boolean {
  const requiredFields = ['text', 'heading', 'code', 'blockquote', 'link', 'background', 'list'];
  
  for (const field of requiredFields) {
    const value = tokens[field as keyof DesignTokens];
    if (!value || typeof value !== 'object') {
      return false;
    }
    // 检查嵌套字段是否都是非空字符串
    for (const subValue of Object.values(value)) {
      if (typeof subValue !== 'string' || subValue.length === 0) {
        return false;
      }
    }
  }
  return true;
}
