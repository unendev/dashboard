
import { deepseek } from '@ai-sdk/deepseek';
import { generateObject } from 'ai';
import { z } from 'zod';
import { findSimilarTags } from '@/lib/tag-similarity';

function buildTaggingPrompt(existingAiTags: string[] = []) {
  const poolHint = existingAiTags.length > 0
    ? `已有 AI 标签池（优先复用，必要时才新增）：${existingAiTags.join(', ')}`
    : '当前无 AI 标签池。';

  return `你是一个专业的分类系统，负责为“藏宝阁”笔记进行精准的AI打标。你的任务是根据用户的笔记内容，严格遵守以下规则，只输出 AI 标签。

**规则宪法：**
1. **主题/领域/概念**：由用户手动维护，不属于 AI 标签。你不得输出 '#领域/...' 或 '#概念/...'，也不要输出主题。
2. **标签格式**：统一使用 '#一级/二级' 格式，实体可使用更深层路径（例如 '#实体/技术/前端/React'）。
3. **性质轴 (Nature)**：
   - 作用：描述笔记的功能或形态。
   - 触发条件：只有内容具备显著特征时才添加，**最多 1 个**。不确定就不要添加。
   - 例子（非限制）：#性质/复盘, #性质/点子, #性质/教训, #性质/精华, #性质/情报, #性质/技巧, #性质/哲思, #性质/资源。
4. **实体轴 (Entity)**：
   - 作用：提取内容中的核心名词或概念，作为知识图谱节点。
   - 格式：#实体/具体名词（允许层级路径）。
   - 规则：尽量完整，但不要胡乱扩展。

${poolHint}

**输出格式**：
请直接返回包含 'tags' 字段的 JSON 对象。`;
}

function buildHumanTagSuggestionPrompt(domainPool: string[], conceptPool: string[]) {
  const domainHint = domainPool.length > 0
    ? `已有领域标签池（优先复用）：${domainPool.join(', ')}`
    : '当前无领域标签池。';
  const conceptHint = conceptPool.length > 0
    ? `已有概念标签池（优先复用）：${conceptPool.join(', ')}`
    : '当前无概念标签池。';

  return `你是一个标签体系助手，只负责**建议**人类标签，不允许直接修改或输出 AI 标签。

**目标**：给出人类标签建议，仅包含以下两类：
1) 领域标签：格式 '#领域/...'，必须是层级语义（如 '#领域/技术/前端/React'）。
2) 概念标签：格式 '#概念/...'，用于高阶主观概念（如 '#概念/迷思'）。

**严格禁止**输出 '#实体/...' 或 '#性质/...'。

**数量限制**：
- 领域标签最多 3 个
- 概念标签最多 2 个
- 总数不超过 5 个

${domainHint}
${conceptHint}

**输出格式**：
请直接返回 JSON 对象，包含 domainTags 和 conceptTags 字段。`;
}

// 定义 Treasure 类型的一个子集，只包含 AI 需要的字段
interface TreasureContent {
  title: string;
  content: string | null;
}

function normalizeAiTags(tags: string[], existingAiTags: string[]): string[] {
  const normalized: string[] = [];
  const pool = existingAiTags ?? [];

  for (const rawTag of tags) {
    const trimmed = rawTag.trim();
    if (!trimmed) continue;

    const withPrefix = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!withPrefix.startsWith('#性质/') && !withPrefix.startsWith('#实体/')) {
      continue;
    }

    const similar = pool.length > 0 ? findSimilarTags(withPrefix, pool, 0.8) : [];
    const finalTag = similar.length > 0 ? similar[0].tag : withPrefix;

    if (!normalized.includes(finalTag)) normalized.push(finalTag);
  }

  return normalized;
}

function normalizeHumanTags(
  tags: string[],
  prefix: '#领域/' | '#概念/',
  pool: string[]
): string[] {
  const normalized: string[] = [];

  for (const rawTag of tags) {
    const trimmed = rawTag.trim();
    if (!trimmed) continue;

    let withPrefix = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (withPrefix.startsWith('#领域/') && prefix !== '#领域/') continue;
    if (withPrefix.startsWith('#概念/') && prefix !== '#概念/') continue;

    if (!withPrefix.startsWith(prefix)) {
      const stripped = withPrefix.replace(/^#/, '');
      if (stripped.startsWith('领域/') || stripped.startsWith('概念/')) {
        withPrefix = `#${stripped}`;
      } else {
        withPrefix = `${prefix}${stripped}`;
      }
    }

    if (!withPrefix.startsWith(prefix)) continue;

    const similar = pool.length > 0 ? findSimilarTags(withPrefix, pool, 0.8) : [];
    const finalTag = similar.length > 0 ? similar[0].tag : withPrefix;

    if (!normalized.includes(finalTag)) normalized.push(finalTag);
  }

  return normalized;
}

export async function generateAiTagsForTreasure(
  treasure: TreasureContent,
  existingAiTags: string[] = []
): Promise<string[]> {
  const poolSample = existingAiTags.slice(0, 120);
  const systemPrompt = buildTaggingPrompt(poolSample);
  const userPrompt = `标题: ${treasure.title}\n\n内容:\n${treasure.content || ''}`;

  try {
    const { object } = await generateObject({
      model: deepseek('deepseek-chat'),
      system: systemPrompt,
      prompt: userPrompt,
      schema: z.object({
        tags: z.array(z.string()).describe('一个包含所有#性质/xx和#实体/xx标签的数组。'),
      }),
    });

    if (object && Array.isArray(object.tags)) {
      return normalizeAiTags(object.tags as string[], existingAiTags);
    }

    return [];
  } catch (error) {
    console.error('Error generating AI tags:', error);
    // 在生产环境中，这里应该有更完善的错误日志记录
    return []; // 发生错误时返回空数组
  }
}

export async function suggestHumanTagsForTreasure(
  treasure: TreasureContent,
  pools: { domain: string[]; concept: string[] }
): Promise<{ domain: string[]; concept: string[] }> {
  const domainPool = pools.domain.slice(0, 120);
  const conceptPool = pools.concept.slice(0, 120);
  const systemPrompt = buildHumanTagSuggestionPrompt(domainPool, conceptPool);
  const userPrompt = `标题: ${treasure.title}\n\n内容:\n${treasure.content || ''}`;

  try {
    const { object } = await generateObject({
      model: deepseek('deepseek-chat'),
      system: systemPrompt,
      prompt: userPrompt,
      schema: z.object({
        domainTags: z.array(z.string()).describe('最多3个领域标签，格式 #领域/...'),
        conceptTags: z.array(z.string()).describe('最多2个概念标签，格式 #概念/...'),
      }),
    });

    const output = object;
    const domain = normalizeHumanTags(output.domainTags || [], '#领域/', domainPool).slice(0, 3);
    const concept = normalizeHumanTags(output.conceptTags || [], '#概念/', conceptPool).slice(0, 2);

    return { domain, concept };
  } catch (error) {
    console.error('Error suggesting human tags:', error);
    return { domain: [], concept: [] };
  }
}
