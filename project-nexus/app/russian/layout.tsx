import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConversationList } from './actions';
import { GuestChatClient } from '../components/learning/GuestChatClient';
import { RussianLayoutClient } from './layout-client';

export default async function RussianLearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    // Guest user experience remains the same
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h1 className="text-xl font-bold">俄语学习</h1>
            <Link href="/api/auth/signin" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
              登录以保存进度
            </Link>
        </header>
        <main className="flex-grow flex flex-col p-4">
          <GuestChatClient />
        </main>
      </div>
    );
  }

  // Logged-in user experience
  const conversations = await getConversationList();
  
  return (
    <RussianLayoutClient conversations={conversations}>
      {children}
    </RussianLayoutClient>
  );
}

