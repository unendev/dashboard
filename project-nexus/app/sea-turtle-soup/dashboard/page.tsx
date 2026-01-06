import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardClient from './dashboard-client';
import { Story } from '@/types/game';

// This function fetches stories from the API.
async function getStories(): Promise<Story[]> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/stories`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch stories on server, status:', response.status);
      return [];
    }

    const stories: Story[] = await response.json();
    return stories;
  } catch (error) {
    console.error('Error fetching stories on server:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stories = await getStories();

  // Mock data as per the plan
  const user = session?.user ?? { id: 'guest', name: 'Guest', image: '' };
  const userStats = {
    completed: 5,
    favorited: 2,
    favoriteTheme: '悬疑',
  };

  if (stories.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 text-red-500">
        <p>无法加载故事列表，请稍后再试。</p>
      </div>
    );
  }

  return <DashboardClient stories={stories} user={user} userStats={userStats} />;
}
