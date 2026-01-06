
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModel } from '@/lib/ai-provider';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const requestId = `parse-${Date.now()}`;
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log(`[AI/PARSE] [${requestId}] Received text: "${text}"`);


    // 读取分类配置作为 Context
    const categoriesPath = path.join(process.cwd(), 'log-categories.json');
    let categoriesData = [];
    try {
      if (fs.existsSync(categoriesPath)) {
        categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
      } else {
        console.warn(`[AI / PARSE] Categories file not found at ${categoriesPath} `);
      }
    } catch (e) {
      console.error(`[AI / PARSE] Failed to read categories: `, e);
    }

    // 扁平化分类用于 Prompt
    const flatCategories: string[] = [];
    if (Array.isArray(categoriesData)) {
      categoriesData.forEach((top: any) => {
        if (top.children) {
          top.children.forEach((mid: any) => {
            flatCategories.push(`${top.name}/${mid.name}`);
          });
        } else {
          flatCategories.push(top.name);
        }
      });
    }

    console.log(`[AI/PARSE] [${requestId}] Loaded ${flatCategories.length} categories for context`);

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
      prompt: `你是一个专业的任务管理助手。请根据用户的输入，提取任务信息。

候选分类列表（必须从中选择一个最接近的）：
${flatCategories.join('\n')}

解析规则：
1. 识别任务名称：提取核心动作或事物。
2. 匹配分类路径：分析输入的语义，将其归类到最合适的候选路径中。
3. 提取标签：将输入中 # 后面的词识别为 instanceTags。标签中不应该包含 # 符号。
4. 提取时长：识别输入中的时间长度描述（如“20分钟”，“1小时”），转换为分钟数。默认为0。

示例：
输入："蓄能" -> { name: "蓄能", categoryPath: "自我复利/身体蓄能", instanceTags: [], duration: 0 }
输入："写代码 30分钟 #项目Nexus" -> { name: "写代码", categoryPath: "工作/开发", instanceTags: ["项目Nexus"], duration: 30 }
输入："#个人网站 1h" -> { name: "个人网站", categoryPath: "项目/个人网站", instanceTags: ["个人网站"], duration: 60 }

用户输入：
"${text}"`,
    });

    console.log(`[AI/PARSE] [${requestId}] Success object:`, object);
    return NextResponse.json(object);

  } catch (error: any) {
    console.error(`[AI/PARSE] [${requestId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}