"use server";

import { revalidatePath } from 'next/cache';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Rating, nextInterval, type FSRSCard } from '@/lib/fsrs';

const prisma = new PrismaClient();

// Helper for logging
const log = (action: string, details: object) => {
  console.log(`[Action: ${action}]`, JSON.stringify(details, null, 2));
};

interface NotePayload {
  content: string;
  sourceText: string;
}

interface FlashcardPayload {
  front: string;
  back: string;
}

/**
 * Creates a new Russian Learning Note for the logged-in user.
 */
export async function createNote(payload: NotePayload) {
  const session = await getServerSession(authOptions);
  log('createNote', { userId: session?.user?.id, hasPayload: !!payload });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const note = await prisma.russianLearningNote.create({
      data: {
        userId: session.user.id,
        content: payload.content,
        sourceText: payload.sourceText,
      },
    });
    revalidatePath('/notes');
    log('createNote', { status: 'success', noteId: note.id });
    return { success: true };
  } catch (error) {
    console.error('Failed to create note:', error);
    return { error: 'Failed to save the note.' };
  }
}

/**
 * Deletes a Russian Learning Note.
 */
export async function deleteNote(noteId: string) {
  const session = await getServerSession(authOptions);
  log('deleteNote', { userId: session?.user?.id, noteId });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    await prisma.russianLearningNote.delete({
      where: {
        id: noteId,
        userId: session.user.id,
      },
    });
    revalidatePath('/notes');
    revalidatePath('/russian');
    log('deleteNote', { status: 'success', noteId });
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete note ${noteId}:`, error);
    return { error: 'Failed to delete note.' };
  }
}

/**
 * Updates a Russian Learning Note's content.
 */
export async function updateNote(noteId: string, content: string) {
  const session = await getServerSession(authOptions);
  log('updateNote', { userId: session?.user?.id, noteId });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    await prisma.russianLearningNote.update({
      where: {
        id: noteId,
        userId: session.user.id,
      },
      data: {
        content: content,
      },
    });
    revalidatePath('/notes');
    revalidatePath('/russian');
    log('updateNote', { status: 'success', noteId });
    return { success: true };
  } catch (error) {
    console.error(`Failed to update note ${noteId}:`, error);
    return { error: 'Failed to update note.' };
  }
}

/**
 * Syncs a flashcard based on note highlighting.
 */
export async function syncFlashcard(action: 'add' | 'remove', front: string, back: string) {
  const session = await getServerSession(authOptions);
  log('syncFlashcard', { userId: session?.user?.id, action, front });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    if (action === 'add') {
      const existing = await prisma.flashcard.findFirst({
        where: {
          userId: session.user.id,
          front: front,
          back: back,
        }
      });

      if (!existing) {
        await prisma.flashcard.create({
          data: {
            userId: session.user.id,
            front: front,
            back: back,
            // Init FSRS defaults if needed, though schema defaults handle it
          },
        });
      }
    } else {
      await prisma.flashcard.deleteMany({
        where: {
          userId: session.user.id,
          front: front,
          back: back,
        },
      });
    }

    revalidatePath('/review');
    revalidatePath('/russian');
    log('syncFlashcard', { status: 'success', action });
    return { success: true };
  } catch (error) {
    console.error(`Failed to sync flashcard (${action}):`, error);
    return { error: 'Failed to sync flashcard.' };
  }
}

/**
 * Creates a new Flashcard manually (deprecated workflow, but kept for compatibility).
 */
export async function createFlashcard(payload: FlashcardPayload) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    const flashcard = await prisma.flashcard.create({
      data: {
        userId: session.user.id,
        front: payload.front,
        back: payload.back,
      },
    });
    revalidatePath('/review');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to save the flashcard.' };
  }
}

/**
 * Updates a flashcard's review stage and next review date based on FSRS.
 */
export async function updateFlashcardReview(cardId: string, performance: 'Forgot' | 'Good' | 'Easy') {
  const session = await getServerSession(authOptions);
  log('updateFlashcardReview', { userId: session?.user?.id, cardId, performance });
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const card = await prisma.flashcard.findUnique({
      where: { id: cardId, userId: session.user.id },
    });

    if (!card) {
      log('updateFlashcardReview', { status: 'error', reason: 'Card not found' });
      return { error: 'Card not found' };
    }

    // Convert Prisma model to FSRSCard
    const fsrsCard: FSRSCard = {
      state: card.stage,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsedDays,
      scheduled_days: card.scheduledDays,
      reps: card.reps,
      last_review: card.lastReview || new Date(),
    };

    // Map UI rating to FSRS rating
    let rating = Rating.Good;
    if (performance === 'Forgot') rating = Rating.Again;
    else if (performance === 'Good') rating = Rating.Good;
    else if (performance === 'Easy') rating = Rating.Easy;

    // Calculate next state
    const newFsrsCard = nextInterval(fsrsCard, rating);

    // Calculate actual next review date
    const now = new Date();
    const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);
    const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

    let nextDate: Date;
    // FSRS schedules in days. If scheduled_days is 0 (or very small), it means due today/soon.
    // For MVP simplicity:
    // If state is Learning/Relearning, intervals are short (minutes).
    // If state is Review, intervals are days.
    
    if (newFsrsCard.state === 1 || newFsrsCard.state === 3) {
       // Learning/Relearning
       if (newFsrsCard.scheduled_days === 0) {
           // Default steps: Again=1min, Hard=5min, Good=10min
           // Since we only have Forgot/Good/Easy:
           if (rating === Rating.Again) nextDate = addMinutes(now, 1);
           else if (rating === Rating.Good) nextDate = addMinutes(now, 10);
           else nextDate = addDays(now, 4); // Easy -> Review directly
       } else {
           nextDate = addDays(now, newFsrsCard.scheduled_days);
       }
    } else {
       // Review
       nextDate = addDays(now, Math.max(1, newFsrsCard.scheduled_days));
    }

    await prisma.flashcard.update({
      where: { id: cardId },
      data: {
        stage: newFsrsCard.state,
        stability: newFsrsCard.stability,
        difficulty: newFsrsCard.difficulty,
        elapsedDays: newFsrsCard.elapsed_days,
        scheduledDays: newFsrsCard.scheduled_days,
        reps: newFsrsCard.reps,
        lastReview: now,
        nextReviewAt: nextDate,
      },
    });

    revalidatePath('/review');
    revalidatePath('/russian');
    log('updateFlashcardReview', { status: 'success', cardId, nextDate });
    return { success: true };

  } catch (error) {
    console.error('Failed to update flashcard review:', error);
    return { error: 'Failed to update the flashcard.' };
  }
}

// === Conversation Actions ===

export async function getConversationList() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });
  return conversations;
}

export async function createConversation() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorized');

  const newConversation = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      title: '新对话',
    },
  });
  
  revalidatePath('/russian');
  return newConversation;
}

export async function getConversationMessages(conversationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversation: {
        id: conversationId,
        userId: session.user.id,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  
  return messages.map(msg => ({ id: msg.id, role: msg.role as 'user' | 'assistant' | 'system', content: msg.content }));
}

interface ChatMessagePayload {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
}

export async function saveChatMessage(payload: ChatMessagePayload) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Unauthorized' };
  
  try {
    const [, message] = await prisma.$transaction([
      prisma.conversation.update({
        where: { id: payload.conversationId },
        data: { updatedAt: new Date() },
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: payload.conversationId,
          role: payload.role,
          content: payload.content,
        },
      }),
    ]);
    
    revalidatePath(`/russian/${payload.conversationId}`);
    return { success: true, message };
  } catch (error) {
    console.error('Failed to save chat message:', error);
    return { error: 'Failed to save chat message.' };
  }
}

export async function updateConversationTitle(conversationId: string, title: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: 'Unauthorized' };
    
    await prisma.conversation.updateMany({
        where: { id: conversationId, userId: session.user.id },
        data: { title },
    });
    revalidatePath('/russian');
}

export async function deleteConversation(conversationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await prisma.conversation.delete({
      where: {
        id: conversationId,
        userId: session.user.id,
      },
    });
    revalidatePath('/russian');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete conversation.' };
  }
}