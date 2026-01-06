/**
 * 标签工具函数 - V5.0 三元标签系统
 * 
 * 设计理念：
 * - 导航标签 (Navigation)：层级结构（包含 /）或顶级领域（如 作品、技术）。用于客观分类。
 * - 概念标签 (Concept)：高维度的思考标记（如 #迷思、#解构）。主观、抽象。
 * - 属性标签 (Attribute)：功能性或性质标记（如 #R18、#灵感、#待办）。客观、元数据。
 */

export type TagType = 'navigation' | 'concept' | 'attribute'

/**
 * 标签颜色配置
 */
export const TAG_COLORS = {
  // 导航标签：蓝色系
  navigation: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    hover: 'hover:bg-blue-500/20'
  },
  
  // 概念标签：紫色/粉色系（神秘、高深）
  concept: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    hover: 'hover:bg-purple-500/20'
  },

  // 属性标签：绿/青色系（功能性）
  attribute: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    hover: 'hover:bg-emerald-500/20'
  }
}

// 概念标签关键词
const CONCEPT_KEYWORDS = new Set([
  '迷思', '哲思', '解构', '抽象', '艺术', '浪漫', '虚无', '本质', '哲学', '意识'
])

// 导航顶级关键词（即不带 / 的也算导航）
const NAVIGATION_ROOTS = new Set([
  '作品', '技术', '社科', '媒体', '奇闻', '见闻', '领域', '资源', '来源'
])

/**
 * 检测标签类型
 */
export function detectTagType(tag: string): TagType {
  // 1. 处理带 # 的标签（最高优先级）
  if (tag.startsWith('#')) {
    const rawContent = tag.slice(1) // 去掉 #
    if (rawContent.startsWith('领域/')) return 'navigation'
    if (rawContent.startsWith('概念/')) return 'concept'
    if (rawContent.startsWith('性质/') || rawContent.startsWith('属性/')) return 'attribute'
    // 如果包含斜杠，取第一部分作为判断依据？或者只要开头匹配关键词？
    // 简单起见，只要含关键词就是 concept，否则 attribute
    // 或者检查 concept 关键词是否匹配标签的一部分
    if ([...CONCEPT_KEYWORDS].some(k => rawContent.includes(k))) {
      return 'concept'
    }
    return 'attribute'
  }

  // 2. 包含 / 必定是导航
  if (tag.includes('/')) return 'navigation'

  // 3. 处理不带 # 且不带 / 的标签
  // 检查是否在已知导航根节点中
  if (NAVIGATION_ROOTS.has(tag)) {
    return 'navigation'
  }
  
  // 兜底：如果是未知的不带#的标签，暂且归为 attribute（或 navigation？）
  // 为了安全，假设它是属性
  return 'attribute'
}

/**
 * 获取标签颜色方案
 */
export function getTagColorScheme(type: TagType) {
  return TAG_COLORS[type]
}

/**
 * 获取标签类型的描述
 */
export function getTagTypeLabel(type: TagType): string {
  switch (type) {
    case 'navigation': return '导航'
    case 'concept': return '概念'
    case 'attribute': return '属性'
  }
}
