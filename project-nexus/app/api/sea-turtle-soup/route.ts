import { NextResponse } from 'next/server';
import { ChatMessage, Story } from '@/types/game';
import fs from 'fs/promises';
import path from 'path';

// Define the base rules for the Game Master LLM
const BASE_RULES = `
你是一个海龟汤主持人。你的记忆里有一个谜底。
玩家会用自然语言问你问题，你只能回答‘是’、‘否’、或‘与此无关’。
如果玩家的猜测非常接近真相，你可以给予一些模糊的提示，例如'你离真相不远了'。
绝对不要直接透露谜底或谜底中的任何名词。
`;



export async function POST(req: Request) {
  try {
    const { messages: userMessages, storyId } = (await req.json()) as {
      messages: ChatMessage[];
      storyId?: string;
    };

    if (!userMessages) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY is not configured' },
        { status: 500 }
      );
    }

    let currentStory: Story | undefined;
    const storiesFilePath = path.join(process.cwd(), 'data', 'stories.json');
    const storiesData = await fs.readFile(storiesFilePath, 'utf-8');
    const stories: Story[] = JSON.parse(storiesData);

    if (storyId) {
      currentStory = stories.find((s) => s.id === storyId);
    } else {
      // Default to the first story if no storyId is provided
      currentStory = stories[0];
    }

    if (!currentStory) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    const systemPrompt = `${BASE_RULES}\n谜底是：“${currentStory.solution}”`;

    // Combine the system prompt with the user's message history
    const messagesToLLM: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...userMessages,
    ];

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // Or another appropriate model
        messages: messagesToLLM,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('DeepSeek API error:', errorBody);
      return NextResponse.json(
        { error: 'Failed to fetch response from LLM' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const llmResponse = data.choices[0]?.message;

    return NextResponse.json({ message: llmResponse });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
