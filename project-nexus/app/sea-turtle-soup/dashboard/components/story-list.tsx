'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Story } from '@/types/game';
import { CheckCircle, Star } from 'lucide-react'; // Assuming lucide-react is available

interface StoryListProps {
  stories: Story[];
  userStoryStates: Record<string, 'completed' | 'favorited' | 'unplayed'>;
}

export default function StoryList({ stories, userStoryStates }: StoryListProps) {
  const [loadingStoryId, setLoadingStoryId] = useState<string | null>(null);
  const router = useRouter();

  const handleStartGame = (storyId: string) => {
    setLoadingStoryId(storyId);
    router.push(`/sea-turtle-soup/play/${storyId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stories.map((story) => {
        const storyState = userStoryStates[story.id];
        return (
          <Card key={story.id} className="card-mystery flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <CardTitle className="mr-2 text-[rgb(var(--color-mystery-ink))] dark:text-[rgb(var(--color-mystery-ink-dark))]">{story.title}</CardTitle>
                <div className="flex items-center gap-1">
                  {storyState === 'completed' && (
                    <span title="已完成">
                      <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-400" />
                    </span>
                  )}
                  {storyState === 'favorited' && (
                    <span title="已收藏">
                      <Star className="h-4 w-4 text-yellow-700 dark:text-yellow-400 fill-yellow-700 dark:fill-yellow-400" />
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap 
                    ${story.theme === '怪谈'
                        ? 'bg-purple-800/20 text-purple-600 dark:bg-purple-300/20 dark:text-purple-300'
                        : story.theme === '悬疑'
                        ? 'bg-blue-800/20 text-blue-600 dark:bg-blue-300/20 dark:text-blue-300'
                        : 'bg-gray-800/20 text-gray-600 dark:bg-gray-300/20 dark:text-gray-300'
                    }`}
                  >
                    {story.theme}
                  </span>
                </div>
              </div>
              <CardDescription className="text-[rgb(var(--color-mystery-ink-light))] dark:text-[rgb(var(--color-mystery-ink-light-dark))]">点击开始解谜</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full button-mystery"
                onClick={() => handleStartGame(story.id)}
                disabled={loadingStoryId !== null}
              >
                {loadingStoryId === story.id ? '正在进入...' : '开始游戏'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
