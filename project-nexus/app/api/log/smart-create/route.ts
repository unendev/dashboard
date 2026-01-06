import { generateText } from 'ai';
import { getAIModel } from '@/lib/ai-provider';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { text, date } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    const categories = await prisma.logCategory.findMany({ select: { name: true, parentId: true, id: true } });
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const categoryContext = categories.map(c => {
      let path = c.name;
      let current = c;
      while (current.parentId && categoryMap.has(current.parentId)) {
        current = categoryMap.get(current.parentId)!;
        path = `${current.name}/${path}`;
      }
      return path;
    }).join(', ');

    const systemPrompt = `You are an AI assistant for a productivity app. Your goal is to parse a raw task input string into a structured JSON object.
    Context:
    - Today's date: ${date || new Date().toISOString().split('T')[0]}
    - Existing Categories: [${categoryContext}]
    
    Input Format Analysis:
    - Natural Language: "Read book for 1 hour" -> Name: "Read book", Time: 3600
    - Structured: "Task (Category) Time"
    - Nesting: "Project > Task" or "Project: Task"
    
    Output JSON Schema:
    {
      "name": "string",
      "parentName": "string",
      "categoryPath": "string",
      "initialTime": number,
      "instanceTags": string[]
    }
    
    Instructions:
    1. Time: Parse "1h", "30m" into seconds. 
    2. Category: If (Category) is given, match it to existing paths. Otherwise infer from name.
    3. Hierarchy: Identify Parent/Child relationships using > or :.
    4. Fallback: If name is missing but category is given, use category as name.
    5. Return ONLY valid JSON.`;

    const { model } = getAIModel({ provider: 'deepseek' });
    const result = await generateText({ model, system: systemPrompt, prompt: text });
    let json = JSON.parse(result.text.replace(/```json/g, '').replace(/```/g, '').trim());

    if (!json.name || json.name.trim() === '') {
      json.name = json.instanceTags?.[0] || json.categoryPath?.split('/').pop() || "未命名";
    }

    if (json.parentName) {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const parent = await prisma.timerTask.findFirst({
          where: { userId: session.user.id, name: { contains: json.parentName, mode: 'insensitive' } },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, categoryPath: true }
        });
        if (parent) {
          json.parentId = parent.id;
          if (!json.categoryPath) json.categoryPath = parent.categoryPath;
        } else {
          json.name = `${json.parentName} - ${json.name}`;
        }
      }
    }
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: 'AI Error' }, { status: 500 });
  }
}
