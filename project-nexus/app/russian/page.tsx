import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// This page handles the base route for logged-in users.
// It finds the most recent conversation and redirects to it,
// or shows a welcome message if no conversations exist.
export default async function RussianLearningBasePage() {
  const session = await getServerSession(authOptions);

  // This page is only for logged-in users. Guests are handled by the layout.
  if (!session?.user?.id) {
    // This should technically not be reached if layout logic is correct,
    // but as a safeguard, redirect to signin.
    redirect('/api/auth/signin');
  }

  console.log(`[Page: /russian] - Finding most recent conversation for user: ${session.user.id}`);

  const mostRecentConversation = await prisma.conversation.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (mostRecentConversation) {
    console.log(`[Page: /russian] - Found recent conversation ${mostRecentConversation.id}. Redirecting...`);
    redirect(`/russian/${mostRecentConversation.id}`);
  }

  // If no conversations are found, display a welcome/instruction message.
  console.log(`[Page: /russian] - No conversations found. Showing welcome message.`);
  return (
    <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">欢迎！</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          从侧边栏选择一个对话，或点击“+ 新对话”开始新的学习。
        </p>
      </div>
    </div>
  );
}
