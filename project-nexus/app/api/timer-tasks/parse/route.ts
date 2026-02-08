
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModel } from '@/lib/ai-provider';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCENES = ['工作', '生活', '维护', '探索'] as const;
const ACTIONS = ['产出', '输入', '协同', '执行', '运营', '恢复'] as const;
const OBJECTS = ['产品', '学业', '身体', '家庭', '关系', '资产', '系统', '内容', '行政', '认知'] as const;

const EMOJI_REGEX = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;

function normalizeTag(tag: string): string {
  return (tag || '')
    .trim()
    .replace(/^#+/, '')
    .replace(EMOJI_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHashTagsFromText(text: string): string[] {
  const raw = text.match(/#([^\s#]+)/g) || [];
  return raw.map((t) => normalizeTag(t)).filter(Boolean);
}

function pickFromMap(value: string, map: Record<string, string>, fallback: string): string {
  const cleaned = (value || '').replace(EMOJI_REGEX, '').trim();
  if (map[cleaned]) return map[cleaned];
  for (const [k, v] of Object.entries(map)) {
    if (cleaned.includes(k)) return v;
  }
  return fallback;
}

function normalizeCategoryPath(input: string): string {
  const parts = (input || '')
    .replace(EMOJI_REGEX, '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  const sceneMap: Record<string, string> = {
    工作: '工作', 职业: '工作', 项目: '工作',
    生活: '生活', 娱乐: '生活',
    维护: '维护', 运行成本: '维护', 日常: '维护',
    探索: '探索', 自我复利: '探索', 价值投资: '探索', 学习: '探索',
  };

  const actionMap: Record<string, string> = {
    产出: '产出', 开发: '产出', 创作: '产出', 编码: '产出',
    输入: '输入', 阅读: '输入', 学习: '输入', 情报: '输入',
    协同: '协同', 沟通: '协同', 会议: '协同', 联系: '协同',
    执行: '执行', 事务: '执行', 办事: '执行',
    运营: '运营', 运维: '运营', 管理: '运营', 复盘: '运营',
    恢复: '恢复', 休息: '恢复', 锻炼: '恢复', 娱乐: '恢复',
  };

  const objectMap: Record<string, string> = {
    产品: '产品', 工程: '产品', 网站: '产品',
    学业: '学业', 学校: '学业', 课程: '学业',
    身体: '身体', 医院: '身体', 健康: '身体',
    家庭: '家庭', 家务: '家庭',
    关系: '关系', 社交: '关系',
    资产: '资产', 理财: '资产',
    系统: '系统', 运维: '系统',
    内容: '内容', 阅读: '内容', 网文: '内容', 游戏: '内容',
    行政: '行政', 事务: '行政',
    认知: '认知', 思考: '认知', 情报: '认知',
  };

  const scene = pickFromMap(parts[0] || '', sceneMap, '探索');
  const action = pickFromMap(parts[1] || '', actionMap, '输入');
  const object = pickFromMap(parts[2] || '', objectMap, '认知');

  // 保底确保三轴合法
  const finalScene = SCENES.includes(scene as any) ? scene : '探索';
  const finalAction = ACTIONS.includes(action as any) ? action : '输入';
  const finalObject = OBJECTS.includes(object as any) ? object : '认知';
  return `${finalScene}/${finalAction}/${finalObject}`;
}

export async function POST(req: Request) {
  const requestId = `parse-${Date.now()}`;
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log(`[AI/PARSE] [${requestId}] Received text: "${text}"`);


    // 读取分类配置仅做兼容（当前解析主规则已切换为三轴）
    const categoriesPath = path.join(process.cwd(), 'log-categories.json');
    if (!fs.existsSync(categoriesPath)) {
      console.warn(`[AI / PARSE] Categories file not found at ${categoriesPath}`);
    }

    const { model } = getAIModel({ provider: 'deepseek', modelId: 'deepseek-chat' });

    // 使用 generateObject 代替 generateText + tools
    // 这是处理结构化数据提取的最佳实践，避免了 Tool Schema 的兼容性问题
    const { object } = await generateObject({
      model,
      schema: z.object({
        name: z.string().describe('任务的简短名称 (Short name/action)'),
        categoryPath: z.string().describe('匹配到的分类路径 (Category path from list)'),
        instanceTags: z.array(z.string()).describe('从输入中提取的标签 (Tags starting with #, without # symbol)'),
        duration: z.number().describe('任务持续时长(分钟)。例如 "20分钟" -> 20, "1小时" -> 60。如果没有提到时长则返回 0'),
      }),
      prompt: `你是任务结构化助手。请把输入解析为固定三轴分类。

【分类格式】
categoryPath 必须是：场景/行为/对象

【场景（只能选其一）】
工作、生活、维护、探索

【行为（只能选其一）】
产出、输入、协同、执行、运营、恢复

【对象（只能选其一）】
产品、学业、身体、家庭、关系、资产、系统、内容、行政、认知

【解析规则】
1) name：提取简短可执行的任务名。
2) categoryPath：必须输出“三段式”，如“工作/产出/产品”。
3) instanceTags：提取主题标签；标签不得包含 #，不得包含 emoji。
4) duration：分钟数；未提及时返回 0。

【示例】
输入："写代码 30分钟 #项目Nexus" -> { name: "写代码", categoryPath: "工作/产出/产品", instanceTags: ["项目Nexus"], duration: 30 }
输入："医院复查" -> { name: "医院复查", categoryPath: "维护/执行/身体", instanceTags: [], duration: 0 }
输入："看技术文章 20分钟" -> { name: "看技术文章", categoryPath: "探索/输入/认知", instanceTags: [], duration: 20 }

用户输入：
"${text}"`,
    });

    const aiTags = Array.isArray(object.instanceTags) ? object.instanceTags : [];
    const textTags = extractHashTagsFromText(text);
    const mergedTags = [...aiTags, ...textTags]
      .map((t) => normalizeTag(t))
      .filter(Boolean);
    const dedupedTags = Array.from(new Set(mergedTags));

    const normalized = {
      ...object,
      categoryPath: normalizeCategoryPath(object.categoryPath),
      instanceTags: dedupedTags,
    };

    console.log(`[AI/PARSE] [${requestId}] Success object:`, normalized);
    return NextResponse.json(normalized);

  } catch (error: any) {
    console.error(`[AI/PARSE] [${requestId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
