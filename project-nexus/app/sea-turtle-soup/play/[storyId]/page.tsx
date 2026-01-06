import SoupPlayerClient from './soup-player-client';

interface StoryListItem {
  id: string;
  title: string;
}

// 在服务器端获取故事标题
async function getStoryTitle(storyId: string): Promise<string> {
  try {
    // 在Next.js中，服务器端fetch应使用绝对URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/stories`, {
      cache: 'no-store', // 确保每次都获取最新数据
    });

    if (!response.ok) {
      console.error('Failed to fetch stories on server, status:', response.status);
      return '谜题加载失败';
    }

    const stories: StoryListItem[] = await response.json();
    const currentStory = stories.find((s) => s.id === storyId);

    return currentStory?.title || '未找到的谜题';
  } catch (error) {
    console.error('Error fetching story title on server:', error);
    return '加载谜题时出错';
  }
}

export default async function SeaTurtleSoupPlayPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const initialTitle = await getStoryTitle(storyId);

  return <SoupPlayerClient storyId={storyId} initialTitle={initialTitle} />;
}
