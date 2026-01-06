"use client";

import { useEffect, useState, useTransition } from 'react'; // Added useState and useEffect
import { useRouter, useParams } from 'next/navigation';
import { deleteConversation } from '../../russian/actions';

interface DeleteConversationButtonProps {
  conversationId: string;
  conversationTitle: string;
}

export function DeleteConversationButton({ conversationId, conversationTitle }: DeleteConversationButtonProps) {
  const [isMounted, setIsMounted] = useState(false); // State to track mount status
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const params = useParams();
  const isActive = params.conversationId === conversationId;

  useEffect(() => {
    setIsMounted(true); // Set to true once component has mounted on client
  }, []);

  if (!isMounted) {
    return null; // Don't render on server or until client-side mount
  }

  const handleDelete = () => {
    const isConfirmed = window.confirm(`您确定要删除对话“${conversationTitle}”吗？此操作无法撤销。`);
    if (!isConfirmed) {
      return;
    }

    console.log(`[Client] Deleting conversation: ${conversationId}`);
    startTransition(async () => {
      try {
        const result = await deleteConversation(conversationId);
        if (result?.error) {
          alert(`删除失败: ${result.error}`);
          console.error(`[Client] Failed to delete conversation ${conversationId}:`, result.error);
        } else {
          console.log(`[Client] Conversation ${conversationId} deleted successfully.`);
          // If the deleted conversation was the active one, redirect.
          if (isActive) {
            router.push('/russian');
          }
        }
      } catch (error) {
        console.error(`[Client] Error during deleteConversation transition for ${conversationId}:`, error);
        alert("删除对话时出错。");
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1 text-gray-400 hover:text-red-500 rounded-md disabled:text-gray-300 disabled:cursor-not-allowed"
      aria-label={`删除对话 ${conversationTitle}`}
      title={`删除对话`}
    >
      {isPending ? (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      ) : (
        // Simple 'x' icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}

