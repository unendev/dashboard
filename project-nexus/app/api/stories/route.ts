import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Story } from '@/types/game';

export async function GET() {
  try {
    const storiesFilePath = path.join(process.cwd(), 'data', 'stories.json');
    const storiesData = await fs.readFile(storiesFilePath, 'utf-8');
    const stories: Story[] = JSON.parse(storiesData);

    // Sort stories to put "怪谈" theme first
    stories.sort((a, b) => {
      if (a.theme === '怪谈' && b.theme !== '怪谈') return -1;
      if (a.theme !== '怪谈' && b.theme === '怪谈') return 1;
      return 0;
    });

    return NextResponse.json(stories);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
