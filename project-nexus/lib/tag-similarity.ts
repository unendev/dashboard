/**
 * 标签相似度检测 - 帮助发现同义词和重复标签
 */

/**
 * 计算两个字符串的编辑距离（Levenshtein Distance）
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // 删除
          dp[i][j - 1] + 1,    // 插入
          dp[i - 1][j - 1] + 1 // 替换
        )
      }
    }
  }

  return dp[m][n]
}

/**
 * 计算标签相似度（0-1之间，1表示完全相同）
 */
export function calculateSimilarity(tag1: string, tag2: string): number {
  if (tag1 === tag2) return 1
  
  const maxLen = Math.max(tag1.length, tag2.length)
  if (maxLen === 0) return 1
  
  const distance = levenshteinDistance(tag1.toLowerCase(), tag2.toLowerCase())
  return 1 - distance / maxLen
}

/**
 * 查找相似标签（可能的同义词）
 * @param newTag 新输入的标签
 * @param existingTags 已有的标签列表
 * @param threshold 相似度阈值（默认0.6）
 * @returns 相似的标签列表，按相似度降序
 */
export function findSimilarTags(
  newTag: string,
  existingTags: string[],
  threshold: number = 0.6
): Array<{ tag: string; similarity: number }> {
  const similarities = existingTags
    .filter(tag => tag !== newTag)
    .map(tag => ({
      tag,
      similarity: calculateSimilarity(newTag, tag)
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)

  return similarities
}

/**
 * 检查标签是否可能是同义词
 */
export function isPotentialSynonym(tag1: string, tag2: string): boolean {
  // 忽略大小写和空格
  const normalized1 = tag1.toLowerCase().replace(/\s+/g, '')
  const normalized2 = tag2.toLowerCase().replace(/\s+/g, '')
  
  // 完全相同
  if (normalized1 === normalized2) return true
  
  // 包含关系（一个是另一个的子串）
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true
  }
  
  // 相似度高于0.7
  return calculateSimilarity(tag1, tag2) > 0.7
}

/**
 * 常见同义词词典（可扩展）
 */
export const SYNONYM_GROUPS = [
  ['游戏开发', '游戏研发', '游戏制作', 'GameDev'],
  ['前端', '前端开发', 'Frontend', 'FE'],
  ['后端', '后端开发', 'Backend', 'BE'],
  ['设计', 'Design', 'UI', 'UX'],
  ['技巧', '技术', '方法', '方案'],
  ['见闻', '见识', '发现'],
  ['点子', '想法', '创意', 'Idea'],
  // 在此添加更多同义词组...
]

/**
 * 查找标签所属的同义词组
 */
export function findSynonymGroup(tag: string): string[] | null {
  const normalized = tag.toLowerCase()
  
  for (const group of SYNONYM_GROUPS) {
    if (group.some(synonym => synonym.toLowerCase() === normalized)) {
      return group
    }
  }
  
  return null
}

