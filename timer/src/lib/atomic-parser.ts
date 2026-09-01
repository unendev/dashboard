import { AtomicItem } from '../types/atomic';

export interface ParsedAtomicText {
  rawText: string;
  title: string;
  tags: string[];
  obsidianLinks: string[];
  estimateMinutes?: number;
}

export function parseAtomicInput(rawText: string): ParsedAtomicText {
  const text = rawText.trim();
  if (!text) {
    return {
      rawText: '',
      title: '',
      tags: [],
      obsidianLinks: []
    };
  }

  // 1. 提取 Obsidian 双向链接 [[Note Name]] 或 [[Note#Heading|Alias]]
  const obsidianLinks: string[] = [];
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(text)) !== null) {
    const rawLink = linkMatch[1].trim();
    if (rawLink) {
      obsidianLinks.push(rawLink);
    }
  }

  // 2. 提取标签 #tag (支持中文、字母、数字、下划线、短横线)
  const tags: string[] = [];
  const tagRegex = /(?:^|\s)#([\u4e00-\u9fa5a-zA-Z0-9_-]+)/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    const tag = tagMatch[1].trim();
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  // 3. 提取时间估算: ~25m, ~1.5h, ~30, 约20分钟
  let estimateMinutes: number | undefined;
  const estimateRegex = /(?:~|约)(\d+(?:\.\d+)?)\s*(m|min|h|小时|分)?/i;
  const estimateMatch = text.match(estimateRegex);
  if (estimateMatch) {
    const num = parseFloat(estimateMatch[1]);
    const unit = (estimateMatch[2] || 'm').toLowerCase();
    if (unit.startsWith('h') || unit.includes('小时')) {
      estimateMinutes = Math.round(num * 60);
    } else {
      estimateMinutes = Math.round(num);
    }
  }

  // 4. 清理生成干净的主标题
  let cleanTitle = text
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // 将 [[笔记]] 简化为 笔记
    .replace(/(?:^|\s)#([\u4e00-\u9fa5a-zA-Z0-9_-]+)/g, '') // 移除 #tag
    .replace(/(?:~|约)\d+(?:\.\d+)?\s*(m|min|h|小时|分)?/gi, '') // 移除估时
    .trim();

  // 如果清理后全空，回退为原始文本
  if (!cleanTitle) {
    cleanTitle = text;
  }

  return {
    rawText: text,
    title: cleanTitle,
    tags,
    obsidianLinks,
    estimateMinutes
  };
}

/**
 * 默认 Obsidian 工作库路径与名称 (已自动默认配置为用户的 novel 知识库)
 */
export const DEFAULT_OBSIDIAN_VAULT = 'novel';
export const DEFAULT_OBSIDIAN_BASE_PATH = 'D:\\HaveToTool\\obsidianRoom\\novel';

/**
 * 生成唤起 Obsidian 的 URL 协议 (支持 vault 名字、文件相对路径、Windows 绝对路径)
 */
export function buildObsidianUri(linkName: string, vault?: string): string {
  // 处理别名或标题锚点: [[Note#Heading|Alias]] -> file = "Note"
  let cleanName = linkName.trim();
  if (cleanName.includes('|')) {
    cleanName = cleanName.split('|')[0].trim();
  }
  let heading = '';
  if (cleanName.includes('#')) {
    const parts = cleanName.split('#');
    cleanName = parts[0].trim();
    heading = parts[1].trim();
  }

  // 1. 如果给出的本身就是完整的 Windows 绝对文件路径
  if (/^[a-zA-Z]:[\\\/]/.test(cleanName)) {
    const encodedPath = encodeURIComponent(cleanName);
    return heading 
      ? `obsidian://open?path=${encodedPath}&heading=${encodeURIComponent(heading)}`
      : `obsidian://open?path=${encodedPath}`;
  }

  const effectiveVault = (vault && vault.trim()) ? vault.trim() : DEFAULT_OBSIDIAN_VAULT;

  // 2. 如果 vault 配置的是绝对目录路径
  if (/^[a-zA-Z]:[\\\/]/.test(effectiveVault)) {
    const normalizedVault = effectiveVault.replace(/[\\\/]+$/, '');
    const normalizedFile = cleanName.replace(/^[\\\/]+/, '');
    const fullPath = `${normalizedVault}\\${normalizedFile}`;
    const encodedPath = encodeURIComponent(fullPath);
    return heading 
      ? `obsidian://open?path=${encodedPath}&heading=${encodeURIComponent(heading)}`
      : `obsidian://open?path=${encodedPath}`;
  }

  // 3. 标准 Vault Name + File 模式 (例如 vault=novel&file=archives/标签定义)
  const params = new URLSearchParams();
  params.set('vault', effectiveVault);
  params.set('file', cleanName);
  if (heading) {
    params.set('heading', heading);
  }

  return `obsidian://open?${params.toString()}`;
}

export function openObsidianLink(linkName: string, vault?: string) {
  const uri = buildObsidianUri(linkName, vault);
  console.log('[Obsidian URI]', uri);
  if (window.electron) {
    window.electron.send('open-external-link', uri);
  } else {
    window.open(uri, '_blank');
  }
}
