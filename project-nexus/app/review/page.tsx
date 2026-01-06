import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FlashcardReviewClient } from './FlashcardReviewClient';

const prisma = new PrismaClient();

export default async function ReviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const dueFlashcards = await prisma.flashcard.findMany({
    where: {
      userId: session.user.id,
      nextReviewAt: {
        lte: new Date(), // Less than or equal to now
      },
    },
    orderBy: {
      nextReviewAt: 'asc', // Review oldest due cards first
    },
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">闪卡复习</h1>
      <FlashcardReviewClient initialCards={dueFlashcards} />
    </div>
  );
}
