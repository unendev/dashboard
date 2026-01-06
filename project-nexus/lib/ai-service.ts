import { TimerDB, TimerTask } from './timer-db';
import { prisma } from './prisma';
import type { WeeklyReviewData } from '@/types/milestone';

interface AISummaryResponse {
  summary: string;
  totalTime: number;
  taskCount: number;
  categories: Record<string, number>;
  insights: string[];
  tasks: Array<{
    id: string;
    name: string;
    categoryPath: string;
    elapsedTime: number;
    completedAt: number | null;
  }>;
}

interface AnalysisData {
  totalTime: number;
  taskCount: number;
  categories: Record<string, number>;
  completedTasks: number;
  runningTasks: number;
  pausedTasks: number;
  tasks: Array<{
    id: string;
    name: string;
    categoryPath: string;
    elapsedTime: number;
    completedAt: number | null;
    isRunning: boolean;
    isPaused: boolean;
  }>;
}

export class AIService {
  private static readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
  private static readonly DEEPSEEK_MODEL = 'deepseek-chat';

  static async generateSummary(userId: string, date: string): Promise<AISummaryResponse> {
    try {
      const tasks = await TimerDB.getTasksByDate(userId, date);
      
      if (tasks.length === 0) {
        return {
          summary: "今天没有记录任何任务活动。",
          totalTime: 0,
          taskCount: 0,
          categories: {},
          insights: [],
          tasks: []
        };
      }

      const analysisData = this.prepareAnalysisData(tasks);
      const aiSummary = await this.callDeepSeekAPI(analysisData, date);
      
      return {
        summary: aiSummary.summary,
        totalTime: analysisData.totalTime,
        taskCount: analysisData.taskCount,
        categories: analysisData.categories,
        insights: aiSummary.insights,
        tasks: analysisData.tasks
      };
    } catch (error) {
      console.error('Error generating AI summary:', error);
      return this.generateFallbackSummary(userId, date);
    }
  }

  static async generateSummaryForRange(userId: string, startDate: string, endDate: string): Promise<AISummaryResponse> {
    try {
      const tasks = await TimerDB.getTasksByDateRange(userId, startDate, endDate);
      
      if (tasks.length === 0) {
        return {
          summary: "所选时间段内没有记录任何任务活动。",
          totalTime: 0,
          taskCount: 0,
          categories: {},
          insights: [],
          tasks: []
        };
      }

      const analysisData = this.prepareAnalysisData(tasks);
      const aiSummary = await this.callDeepSeekAPIForRange(analysisData, startDate, endDate);
      
      return {
        summary: aiSummary.summary,
        totalTime: analysisData.totalTime,
        taskCount: analysisData.taskCount,
        categories: analysisData.categories,
        insights: aiSummary.insights,
        tasks: analysisData.tasks
      };
    } catch (error) {
      console.error('Error generating AI summary for range:', error);
      return this.generateFallbackSummaryForRange(userId, startDate, endDate);
    }
  }

  private static prepareAnalysisData(tasks: TimerTask[]): AnalysisData {
    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const taskCount = tasks.length;
    const categories: Record<string, number> = {};
    
    tasks.forEach(task => {
      const category = (task.categoryPath || '未分类').split('/')[0] || '未分类';
      categories[category] = (categories[category] || 0) + task.elapsedTime;
    });

    const tasksWithTime = tasks.filter(task => task.elapsedTime > 0);
    const tasksWithoutTime = tasks.filter(task => task.elapsedTime === 0);

    return {
      totalTime,
      taskCount,
      categories,
      completedTasks: tasksWithTime.length,
      runningTasks: 0,
      pausedTasks: tasksWithoutTime.length,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name || '未命名任务',
        categoryPath: task.categoryPath || '未分类',
        elapsedTime: task.elapsedTime,
        completedAt: task.completedAt,
        isRunning: task.isRunning,
        isPaused: task.isPaused
      }))
    };
  }

  private static async callDeepSeekAPI(data: AnalysisData, date: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const systemPrompt = `你是时间数据分析器。以精炼、客观的方式总结计时数据，不做价值判断。

输出规则：
1. 陈述事实和数据，不使用评价性词汇（如"良好""不错""需要改进"等）
2. 使用精确的数字和百分比
3. 指出时间分配的客观特征和模式
4. insights为3条数据观察，每条不超过50字
5. 语言简洁、直接，类似数据报告风格

输出格式（纯JSON，无markdown）：
{
  "summary": "总体数据概述",
  "insights": ["数据观察1", "数据观察2", "数据观察3"]
}`;

    const userPrompt = `请分析以下计时数据并生成总结：

日期：${date}
总计时时间：${Math.floor(data.totalTime / 3600)}小时${Math.floor((data.totalTime % 3600) / 60)}分钟
任务总数：${data.taskCount}个
有效计时任务：${data.completedTasks}个（有计时时间的任务）

时间分配：
${Object.entries(data.categories).map(([category, time]) => 
  `- ${category}: ${Math.floor(time / 3600)}小时${Math.floor((time % 3600) / 60)}分钟`
).join('\n')}

任务详情：
${data.tasks.filter(task => task.elapsedTime > 0).map(task => 
  `- ${task.name} (${task.categoryPath}): ${Math.floor(task.elapsedTime / 3600)}小时${Math.floor((task.elapsedTime % 3600) / 60)}分钟`
).join('\n')}`;

    const response = await fetch(this.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from DeepSeek API');
    }

    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || content,
        insights: parsed.insights || []
      };
    } catch {
      return {
        summary: content,
        insights: []
      };
    }
  }

  private static async callDeepSeekAPIForRange(data: AnalysisData, startDate: string, endDate: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const systemPrompt = `你是时间数据分析器。以精炼、客观的方式总结时间段内的计时数据，不做价值判断。

输出规则：
1. 陈述事实和数据，不使用评价性词汇（如"良好""不错""需要改进"等）
2. 使用精确的数字和百分比描述时间分布
3. 指出时间分配的客观特征和趋势
4. insights为3条数据观察，每条不超过50字
5. 语言简洁、直接，类似数据报告风格

输出格式（纯JSON，无markdown）：
{
  "summary": "时间段数据概述",
  "insights": ["数据观察1", "数据观察2", "数据观察3"]
}`;

    const userPrompt = `请分析以下时间段的计时数据：

时间范围：${startDate} 至 ${endDate}
总计时时间：${Math.floor(data.totalTime / 3600)}小时${Math.floor((data.totalTime % 3600) / 60)}分钟
任务总数：${data.taskCount}个
有效计时任务：${data.completedTasks}个（有计时时间的任务）

时间分配：
${Object.entries(data.categories).map(([category, time]) => 
  `- ${category}: ${Math.floor(time / 3600)}小时${Math.floor((time % 3600) / 60)}分钟`
).join('\n')}

主要任务（时长超过30分钟）：
${data.tasks.filter(task => task.elapsedTime >= 1800).slice(0, 10).map(task => 
  `- ${task.name} (${task.categoryPath}): ${Math.floor(task.elapsedTime / 3600)}小时${Math.floor((task.elapsedTime % 3600) / 60)}分钟`
).join('\n')}`;

    const response = await fetch(this.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from DeepSeek API');
    }

    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || content,
        insights: parsed.insights || []
      };
    } catch {
      return {
        summary: content,
        insights: []
      };
    }
  }

  private static async generateFallbackSummary(userId: string, date: string): Promise<AISummaryResponse> {
    const tasks = await TimerDB.getTasksByDate(userId, date);
    
    if (tasks.length === 0) {
      return {
        summary: "今天没有记录任何任务活动。",
        totalTime: 0,
        taskCount: 0,
        categories: {},
        insights: [],
        tasks: []
      };
    }

    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const taskCount = tasks.length;
    const categories: Record<string, number> = {};
    
    tasks.forEach(task => {
      const category = (task.categoryPath || '未分类').split('/')[0] || '未分类';
      categories[category] = (categories[category] || 0) + task.elapsedTime;
    });

    const insights: string[] = [];
    
    if (totalTime > 8 * 3600) {
      insights.push("今天工作时间超过8小时，请注意休息。");
    }
    
    if (taskCount > 5) {
      insights.push("任务数量较多，建议集中精力在重要任务上。");
    }
    
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      insights.push(`在"${topCategory[0]}"类别上投入了最多时间，占总时间的${Math.round(topCategory[1] / totalTime * 100)}%。`);
    }

    const tasksWithTime = tasks.filter(task => task.elapsedTime > 0);
    if (tasksWithTime.length > 0) {
      insights.push(`完成了${tasksWithTime.length}个任务的时间投入，时间管理良好！`);
    }

    const summary = `今天总共计时了${Math.floor(totalTime / 3600)}小时${Math.floor((totalTime % 3600) / 60)}分钟，涉及${taskCount}个任务。${insights.join(' ')}`;

    return {
      summary,
      totalTime,
      taskCount,
      categories,
      insights,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name || '未命名任务',
        categoryPath: task.categoryPath || '未分类',
        elapsedTime: task.elapsedTime,
        completedAt: task.completedAt
      }))
    };
  }

  private static async generateFallbackSummaryForRange(userId: string, startDate: string, endDate: string): Promise<AISummaryResponse> {
    const tasks = await TimerDB.getTasksByDateRange(userId, startDate, endDate);
    
    if (tasks.length === 0) {
      return {
        summary: "所选时间段内没有记录任何任务活动。",
        totalTime: 0,
        taskCount: 0,
        categories: {},
        insights: [],
        tasks: []
      };
    }

    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const taskCount = tasks.length;
    const categories: Record<string, number> = {};
    
    tasks.forEach(task => {
      const category = (task.categoryPath || '未分类').split('/')[0] || '未分类';
      categories[category] = (categories[category] || 0) + task.elapsedTime;
    });

    const insights: string[] = [];
    const avgTimePerDay = totalTime / Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1));
    
    insights.push(`平均每天计时${Math.floor(avgTimePerDay / 3600)}小时${Math.floor((avgTimePerDay % 3600) / 60)}分钟。`);
    
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      insights.push(`主要投入在"${topCategory[0]}"类别，占总时间的${Math.round(topCategory[1] / totalTime * 100)}%。`);
    }

    const tasksWithTime = tasks.filter(task => task.elapsedTime > 0);
    insights.push(`完成了${tasksWithTime.length}个任务的时间投入。`);

    const summary = `从${startDate}到${endDate}，总共计时了${Math.floor(totalTime / 3600)}小时${Math.floor((totalTime % 3600) / 60)}分钟，涉及${taskCount}个任务。${insights.join(' ')}`;

    return {
      summary,
      totalTime,
      taskCount,
      categories,
      insights,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name || '未命名任务',
        categoryPath: task.categoryPath || '未分类',
        elapsedTime: task.elapsedTime,
        completedAt: task.completedAt
      }))
    };
  }

  /**
   * 生成每周回顾报告
   * @param userId 用户ID
   * @param startDate 开始日期 (YYYY-MM-DD)
   * @param endDate 结束日期 (YYYY-MM-DD)
   * @returns 周报数据
   */
  static async generateWeeklyReview(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<WeeklyReviewData> {
    try {
      // 1. 查询时间范围内的任务（仅 2025-10-10 之后的数据）
      const tasks = await prisma.timerTask.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          createdAt: {
            gte: new Date('2025-10-10T00:00:00Z'),
          },
          elapsedTime: {
            gt: 0, // 只统计有时长的任务
          },
        },
        orderBy: {
          elapsedTime: 'desc',
        },
        take: 100, // 限制数量，避免 Prompt 过长
      });

      if (tasks.length === 0) {
        return {
          aiTitle: '休整的一周',
          aiFocus: '本周没有记录任何计时活动，或许是在休息调整。',
          aiInsights: ['适当的休息对保持长期效率很重要'],
          aiKeyAchievements: [],
        };
      }

      // 2. 数据预处理
      const normalizedTasks = tasks.map(task => ({
        id: task.id,
        name: task.name || '未命名任务',
        categoryPath: task.categoryPath || '未分类',
        elapsedTime: task.elapsedTime
      }));
      const analysisData = this.prepareWeeklyAnalysisData(normalizedTasks, startDate, endDate);

      // 3. 调用 DeepSeek API 生成周报
      const weeklyReview = await this.callDeepSeekForWeeklyReview(analysisData);

      return weeklyReview;
    } catch (error) {
      console.error('Error generating weekly review:', error);
      return this.generateFallbackWeeklyReview(userId, startDate, endDate);
    }
  }

  private static prepareWeeklyAnalysisData(
    tasks: Array<{
      id: string;
      name: string;
      categoryPath: string;
      elapsedTime: number;
    }>,
    startDate: string,
    endDate: string
  ) {
    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const taskCount = tasks.length;

    // 按分类聚合时间
    const categories: Record<string, number> = {};
    tasks.forEach((task) => {
      const category = (task.categoryPath || '未分类').split('/')[0] || '未分类';
      categories[category] = (categories[category] || 0) + task.elapsedTime;
    });

    // 识别关键任务（时长 > 1小时）
    const keyTasks = tasks.filter((task) => task.elapsedTime >= 3600);

    return {
      startDate,
      endDate,
      totalTime,
      taskCount,
      categories,
      keyTasks: keyTasks.map((task) => ({
        id: task.id,
        name: task.name,
        categoryPath: task.categoryPath,
        duration: task.elapsedTime,
      })),
    };
  }

  private static async callDeepSeekForWeeklyReview(data: { 
    startDate: string; 
    endDate: string; 
    totalTime: number; 
    taskCount: number; 
    categories: Record<string, number>; 
    keyTasks: Array<{ id: string; name: string; categoryPath: string; duration: number }> 
  }): Promise<WeeklyReviewData> {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const systemPrompt = `你是个人成长分析助手。基于用户一周的计时数据，生成每周回顾报告。

要求：
1. 提炼本周主要投入方向（焦点）
2. 识别3-5个最有价值的成果（时长>=1小时的任务）
3. 给出2-3条成长洞察
4. 使用激励性、专业的语言
5. 使用中文回复

严格按照以下JSON格式返回（不要包含 markdown 代码块标记）：
{
  "title": "一句话总结这一周（如：在技术学习上全力冲刺的一周）",
  "focus": "本周主要聚焦在XX领域，投入了XX小时，占总时间的XX%",
  "insights": ["洞察1", "洞察2"],
  "keyAchievements": [
    {
      "taskId": "任务ID",
      "taskName": "任务名称",
      "categoryPath": "分类路径",
      "duration": 时长秒数,
      "reason": "为什么这个任务重要或有价值"
    }
  ]
}`;

    const userPrompt = `请分析以下一周的计时数据并生成周报：

时间范围：${data.startDate} 至 ${data.endDate}
总计时时间：${Math.floor(data.totalTime / 3600)}小时${Math.floor((data.totalTime % 3600) / 60)}分钟
任务总数：${data.taskCount}个

时间分配：
${Object.entries(data.categories)
  .sort(([, a], [, b]) => (b as number) - (a as number))
  .map(([category, time]) => `- ${category}: ${Math.floor((time as number) / 3600)}小时${Math.floor(((time as number) % 3600) / 60)}分钟 (${Math.round(((time as number) / data.totalTime) * 100)}%)`)
  .join('\n')}

关键任务（时长>=1小时）：
${data.keyTasks
  .map(
    (task: { name: string; categoryPath: string; duration: number }) =>
      `- ${task.name} (${task.categoryPath}): ${Math.floor(task.duration / 3600)}小时${Math.floor((task.duration % 3600) / 60)}分钟`
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
        stream: false,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from DeepSeek API');
    }

    try {
      // 清理可能的 markdown 代码块标记
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanContent);

      return {
        aiTitle: parsed.title || '本周回顾',
        aiFocus: parsed.focus || '',
        aiInsights: parsed.insights || [],
        aiKeyAchievements: parsed.keyAchievements || [],
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  private static async generateFallbackWeeklyReview(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<WeeklyReviewData> {
    const tasks = await prisma.timerTask.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        elapsedTime: { gt: 0 },
      },
    });

    if (tasks.length === 0) {
      return {
        aiTitle: '休整的一周',
        aiFocus: '本周没有记录计时活动。',
        aiInsights: [],
        aiKeyAchievements: [],
      };
    }

    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const categories: Record<string, number> = {};

    tasks.forEach((task) => {
      const category = (task.categoryPath || '未分类').split('/')[0] || '未分类';
      categories[category] = (categories[category] || 0) + task.elapsedTime;
    });

    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    const topTasks = tasks
      .filter((t) => t.elapsedTime >= 3600)
      .sort((a, b) => b.elapsedTime - a.elapsedTime)
      .slice(0, 5);

    return {
      aiTitle: `${topCategory[0]}领域投入的一周`,
      aiFocus: `本周主要聚焦在"${topCategory[0]}"领域，投入了${Math.floor(topCategory[1] / 3600)}小时，占总时间的${Math.round((topCategory[1] / totalTime) * 100)}%。`,
      aiInsights: [
        `完成了${tasks.length}个任务的时间投入`,
        `平均每个任务投入${Math.round(totalTime / tasks.length / 60)}分钟`,
      ],
      aiKeyAchievements: topTasks
        .filter(task => task.name) // 过滤掉没有名称的任务
        .map((task) => ({
          taskId: task.id,
          taskName: task.name!,
          categoryPath: task.categoryPath || '未分类',
          duration: task.elapsedTime,
          reason: '重要的时间投入',
        })),
    };
  }
}


