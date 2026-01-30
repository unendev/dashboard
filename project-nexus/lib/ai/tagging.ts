
import { deepseek } from '@ai-sdk/deepseek';
import { generateObject } from 'ai';
import { z } from 'zod';
import { findSimilarTags } from '@/lib/tag-similarity';

function buildTaggingPrompt(existingAiTags: string[] = [], userTags: string[] = []) {
  const poolHint = existingAiTags.length > 0
    ? `已有 AI 标签池（优先复用，必要时才新增）：${existingAiTags.slice(0, 30).join(', ')}`
    : '当前无 AI 标签池。';

  return `你是一个专业的分类系统，负责为“藏宝阁”笔记进行精准的AI打标。
你的任务是：基于内容提取客观的**实体**和**性质**。

**规则与权限**：
1. 核心任务是提取 **#实体** 和 **#性质**。
2. **特殊授权**：如果用户在上下文中明确指示了分类（领域/概念），或者内容分类特征极强，**你被允许且应当输出 '#领域/...' 和 '#概念/...' 标签**。
3. 但请注意，不要随意把弱相关的领域强加给用户，保持适度克制。


**你的核心职责（书记官模式）**：
1. **实体轴 (Entity) - 必须尽力提取**：
   - **指令**：扫描文中所有专有名词、产品名、人名、组织名、技术栈。不要犹豫，只要是客观存在的实体，统统提取。
   - **示例**：
     - 内容："建议 War Thunder 联动 BanG Dream!" -> 提取：'#实体/游戏/WarThunder', '#实体/动漫/BanG_Dream'
     - 内容："使用 React 和 Next.js 开发" -> 提取：'#实体/技术/React', '#实体/技术/Next.js'
   - **原则**：宁可多提（之后人类可以删），不可漏提。

2. **性质轴 (Nature)**：
   - 作用：描述笔记的功能或形态（如 #性质/教程, #性质/灵感）。

3. **领域/概念轴 (Domain/Concept)**：
   - **仅在有明确依据时输出**。例如用户说“帮我归档到Rust”，则输出 '#领域/技术/Rust'。

${poolHint}

**输出格式**：
请直接返回包含 'tags' 字段的 JSON 对象。`;
}

function buildHumanTagSuggestionPrompt(domainPool: string[], conceptPool: string[], userTags: string[] = []) {
  const domainHint = domainPool.length > 0
    ? `已有领域标签池（优先复用）：${domainPool.join(', ')}`
    : '当前无领域标签池。';
  const conceptHint = conceptPool.length > 0
    ? `已有概念标签池（优先复用）：${conceptPool.join(', ')}`
    : '当前无概念标签池。';

  return `你是一个标签体系助手，只负责**建议**人类标签。
  
**当前用户已选标签**：${userTags.length > 0 ? userTags.join(', ') : '无'}

**目标**：基于用户的内容和 **已选标签**，提供 **补充性** 的建议。
1. 如果用户已选了某个领域（如 #领域/游戏），请思考是否需要补充相关领域（如 #领域/技术 或 #领域/设计）。
2. 如果用户没选领域，请推荐最合适的领域。
3. 概念同理。

**输出规则**：
1. 领域标签：格式 '#领域/...'，必须是层级语义。
2. 概念标签：格式 '#概念/...'，用于高阶主观概念。
3. **不要重复**用户已经选过的标签。
4. **严格禁止**输出 '#实体/...' 或 '#性质/...'。

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
  tags?: string[];
}

function normalizeAiTags(tags: string[], existingAiTags: string[]): string[] {
  const normalized: string[] = [];
  const pool = existingAiTags ?? [];

  for (const rawTag of tags) {
    const trimmed = rawTag.trim();
    if (!trimmed) continue;

    const withPrefix = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

    // [Updated] Allow all tag types (Domain/Concept/Entity/Nature)
    // The previous restriction is lifted to support "System 2" workflow where AI handles classification based on user context.
    if (!withPrefix.startsWith('#')) {
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
  existingAiTags: string[] = [],
  userTags: string[] = [], // New Param
  auxiliaryContext?: string // 【新增】辅助上下文
): Promise<string[]> {
  // Combine treasure.tags if provided
  const finalUserTags = userTags.length > 0 ? userTags : (treasure.tags || []);

  const poolSample = existingAiTags.slice(0, 120);
  const systemPrompt = buildTaggingPrompt(poolSample, finalUserTags);
  const contextPart = auxiliaryContext ? `\n\n**用户补充上下文(High Priority)**:\n${auxiliaryContext}` : '';
  const userPrompt = `标题: ${treasure.title}\n\n内容:\n${treasure.content || ''}${contextPart}`;

  console.log('[AI Tagging Lib] Start. Context:', auxiliaryContext ? 'YES' : 'NO', auxiliaryContext);

  try {
    const { object } = await generateObject({
      model: deepseek('deepseek-chat'),
      system: systemPrompt,
      prompt: userPrompt,
      schema: z.object({
        tags: z.array(z.string()).describe('补全的标签数组，包含 #领域, #概念, #性质, #实体 等缺失维度。'),
      }),
    });

    console.log('[AI Tagging Lib] AI Raw Output:', object?.tags);

    if (object && Array.isArray(object.tags)) {
      const normalized = normalizeAiTags(object.tags as string[], existingAiTags);
      console.log('[AI Tagging Lib] Normalized Output:', normalized);
      return normalized;
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
  pools: { domain: string[]; concept: string[] },
  userTags: string[] = [] // New Param
): Promise<{ domain: string[]; concept: string[] }> {
  const domainPool = pools.domain.slice(0, 120);
  const conceptPool = pools.concept.slice(0, 120);
  const systemPrompt = buildHumanTagSuggestionPrompt(domainPool, conceptPool, userTags);
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
