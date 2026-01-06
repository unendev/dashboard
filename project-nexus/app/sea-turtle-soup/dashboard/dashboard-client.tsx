'use client';

import { useState, useMemo } from 'react';
import { Story } from '@/types/game';
import { User } from 'next-auth';

import UserStatsOverview from './components/user-stats-overview';
import StoryFilters from './components/story-filters';
import StoryList from './components/story-list';

interface DashboardClientProps {
  stories: Story[];
  user: User & { id: string };
  userStats: {
    completed: number;
    favorited: number;
    favoriteTheme: string;
  };
}

// Mock user story states for filtering
const mockUserStoryStates: Record<string, 'completed' | 'favorited' | 'unplayed'> = {
  // Example IDs - replace with actual story IDs from your data if available
  // 'clrkq9k340003h3845o9y017j': 'completed', // Assuming this is a story ID that exists
  // 'clrkq9k340003h3845o9y017k': 'favorited', // Assuming this is another story ID
  // Add more mock data as needed for testing filter functionality
};

export default function DashboardClient({
  stories,
  user,
  userStats,
}: DashboardClientProps) {
  const [filters, setFilters] = useState({
    search: '',
    theme: 'all',
    status: 'all',
  });

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const searchMatch = story.title
        .toLowerCase()
        .includes(filters.search.toLowerCase());
      const themeMatch =
        filters.theme === 'all' || story.theme === filters.theme;

      let statusMatch = true;
      if (filters.status !== 'all') {
        const storyState = mockUserStoryStates[story.id];
        if (filters.status === 'completed') {
          statusMatch = storyState === 'completed';
        } else if (filters.status === 'favorited') {
          statusMatch = storyState === 'favorited';
        } else if (filters.status === 'unplayed') {
          // A story is 'unplayed' if it's not in our mock states or not marked completed/favorited
          statusMatch = !storyState || (storyState !== 'completed' && storyState !== 'favorited');
        }
      }

      return searchMatch && themeMatch && statusMatch;
    });
  }, [stories, filters]);

  return (
    <div className="min-h-screen text-[rgb(var(--color-mystery-ink-light))] dark:text-[rgb(var(--color-mystery-ink-light-dark))] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">海龟汤看板</h1>
          <p className="text-muted-foreground mt-2">
            欢迎回来, {user.name}!
          </p>
          <UserStatsOverview stats={userStats} />
        </header>

        <div className="mb-8">
          <StoryFilters
            onFilterChange={(newFilters) =>
              setFilters((prev) => ({ ...prev, ...newFilters }))
            }
          />
        </div>

        <main>
          <h2 className="text-2xl font-semibold mb-4">故事列表</h2>
          <StoryList stories={filteredStories} userStoryStates={mockUserStoryStates} />
        </main>
      </div>
    </div>
  );
}
