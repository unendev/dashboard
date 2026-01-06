import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { getConversationMessages } from '../actions';
import { LearningOverlay } from '../../components/learning/LearningOverlay';

const prisma = new PrismaClient();

interface RussianChatPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default async function RussianChatPage({ params }: RussianChatPageProps) {
  const { conversationId } = await params;
  console.log(`[Page: /russian/[id]] - Rendering for conversationId: ${conversationId}`);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log("[Page: /russian/[id]] - No session found, redirecting to signin.");
    redirect('/api/auth/signin');
  }

  // Parallel data fetching for performance
  const [initialMessages, notes, dueFlashcards, allFlashcards, totalFlashcardsCount] = await Promise.all([
    getConversationMessages(conversationId),
    prisma.russianLearningNote.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit to recent notes for performance
    }),
    prisma.flashcard.findMany({
      where: {
        userId: session.user.id,
        nextReviewAt: { lte: new Date() },
      },
      orderBy: { nextReviewAt: 'asc' },
      take: 10,
    }),
    prisma.flashcard.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100, // List view limit
    }),
    prisma.flashcard.count({
      where: { userId: session.user.id }
    })
  ]);

  console.log(`[Page: /russian/[id]] - Fetched ${initialMessages.length} msgs, ${notes.length} notes, ${dueFlashcards.length} due cards.`);
  
  return (
    <div className="h-screen bg-gray-950">
        <LearningOverlay 
          initialMessages={initialMessages} 
          conversationId={conversationId}
          notes={notes}
          flashcards={dueFlashcards}
          allFlashcards={allFlashcards}
          totalFlashcardsCount={totalFlashcardsCount}
        />
    </div>
  );
}

