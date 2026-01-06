/**
 * 人生阁 - 每日进度AI分析服务
 * 支持对话式迭代调整
 */

import { prisma } from './prisma';

// 任务分析结果
interface TaskAnalysis {
  taskId: string;
  taskName: string;
  duration: number; // 秒
  categoryPath: string;
  extractedSkills: string[];
  actionType: string; // 学习/实现/优化/修复
  importance: number; // 1-5
  growthType: string; // 新技能学习/熟练应用/精通深化
  proficiencyDelta: number; // 熟练度变化
  reasoning: string; // AI的判断理由
}

// 每日分析结果
export interface DailyAnalysisResult {
  date: string;
  totalHours: number;
  taskAnalyses: TaskAnalysis[];
  extractedSkills: Array<{
    skill: string;
    level: number;
    delta: number;
    isNew: boolean;
  }>;
  extractedProjects: Array<{
    name: string;
    hours: number;
  }>;
  insights: string[];
}

export class ProgressAIService {
  private static readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
  private static readonly DEEPSEEK_MODEL = 'deepseek-chat';

  /**
   * 生成每日进度初步分析
   */
  static async generateDailyAnalysis(
    userId: string,
    targetDate: string
  ): Promise<DailyAnalysisResult> {
    try {
      // 1. 获取目标日期的所有任务
      const tasks = await prisma.timerTask.findMany({
        where: {
          userId,
          date: targetDate,
          elapsedTime: { gt: 0 },
        },
        orderBy: { elapsedTime: 'desc' },
      });

      if (tasks.length === 0) {
        return {
          date: targetDate,
          totalHours: 0,
          taskAnalyses: [],
          extractedSkills: [],
          extractedProjects: [],
          insights: ['今天没有计时记录'],
        };
      }

      // 2. 获取用户的技能档案（用于判断熟练度变化）
      const skillProfiles = await prisma.skillProfile.findMany({
        where: { userId },
      });

      const skillMap = new Map(
        skillProfiles.map((s) => [s.skillName, s.proficiency])
      );

      // 3. 数据预处理：转换任务数据格式
      const normalizedTasks = tasks
        .filter(task => task.name && task.categoryPath) // 过滤掉无效任务
        .map(task => ({
          name: task.name!,
          elapsedTime: task.elapsedTime,
          categoryPath: task.categoryPath!
        }));

      // 4. 调用AI进行深度分析
      const analysis = await this.callAIForAnalysis(normalizedTasks, skillMap, targetDate);

      return analysis;
    } catch (error) {
      console.error('[ProgressAI] Generate daily analysis failed:', error);
      throw error;
    }
  }

  /**
   * 基于用户反馈调整分析
   */
  static async refineAnalysisWithFeedback(
    previousAnalysis: DailyAnalysisResult,
    userFeedback: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<DailyAnalysisResult> {
    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DeepSeek API key not configured');

      const systemPrompt = `你是个人成长分析助手。用户对之前的分析提出了反馈，请根据反馈调整分析结果。

核心原则:
1. 尊重用户的自我评估
2. 根据反馈调整技能熟练度、重要性判断
3. 保持客观和激励性的语言
4. 输出JSON格式

原始分析:
${JSON.stringify(previousAnalysis, null, 2)}

用户反馈:
"${userFeedback}"

请输出调整后的完整分析结果（与原格式相同的JSON）`;

      const messages = [
        ...conversationHistory,
        { role: 'user', content: userFeedback },
      ];

      const response = await fetch(this.DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content from AI');
      }

      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const refined = JSON.parse(cleanContent);

      return refined;
    } catch (error) {
      console.error('[ProgressAI] Refine with feedback failed:', error);
      throw error;
    }
  }

  /**
   * 调用AI进行任务分析
   */
  private static async callAIForAnalysis(
    tasks: Array<{ name: string; elapsedTime: number; categoryPath: string }>,
    skillMap: Map<string, number>,
    date: string
  ): Promise<DailyAnalysisResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DeepSeek API key not configured');

    const totalSeconds = tasks.reduce((sum, t) => sum + t.elapsedTime, 0);
    const totalHours = totalSeconds / 3600;

    // 构建技能档案信息
    const skillContext = Array.from(skillMap.entries())
      .map(([skill, prof]) => `${skill}: ${Math.round(prof)}%`)
      .join(', ');

    const systemPrompt = `你是个人成长分析助手。分析用户的每日计时任务，提取技能、判断成长类型。

用户当前技能档案:
${skillContext || '暂无'}

分析要求:
1. 从任务名提取具体技能（如"解决bug"→提取"调试"、"问题定位"）
2. 识别动作类型（学习/实现/优化/修复）
3. 判断成长类型：
   - 新技能学习：首次接触
   - 熟练应用：已掌握，正常使用
   - 精通深化：解决复杂问题，深度应用
4. 评估重要性（1-5星）
5. 估算熟练度变化（-10到+10）
6. 识别项目标签（#开头）

输出严格的JSON格式（不要markdown）：
{
  "date": "${date}",
  "totalHours": ${totalHours.toFixed(2)},
  "taskAnalyses": [
    {
      "taskId": "任务ID",
      "taskName": "任务名",
      "duration": 秒数,
      "categoryPath": "分类路径",
      "extractedSkills": ["技能1", "技能2"],
      "actionType": "实现",
      "importance": 4,
      "growthType": "新技能学习",
      "proficiencyDelta": 5,
      "reasoning": "判断理由"
    }
  ],
  "extractedSkills": [
    { "skill": "React", "level": 75, "delta": 2, "isNew": false }
  ],
  "extractedProjects": [
    { "name": "#个人门户", "hours": 2.5 }
  ],
  "insights": ["洞察1", "洞察2"]
}`;

    const userPrompt = `请分析以下任务：

${tasks
  .map(
    (t, i) =>
      `${i + 1}. ${t.name} (${t.categoryPath}) - ${Math.floor(t.elapsedTime / 3600)}h${Math.floor((t.elapsedTime % 3600) / 60)}m`
  )
  .join('\n')}`;

    const response = await fetch(this.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content from AI');
    }

    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    return parsed;
  }
}


