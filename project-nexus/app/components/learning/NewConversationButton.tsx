"use client";

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createConversation } from '../../russian/actions';

export function NewConversationButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleNewConversation = () => {
    console.log("Client: 'New Conversation' button clicked.");
    startTransition(async () => {
      try {
        console.log("Client: Calling createConversation server action...");
        const newConversation = await createConversation();
        if (newConversation?.id) {
          console.log(`Client: Server action successful. New conversation ID: ${newConversation.id}. Redirecting...`);
          router.push(`/russian/${newConversation.id}`);
        } else {
          console.error("Client: createConversation failed to return a valid conversation object.", newConversation);
          alert("创建新对话失败，请重试。");
        }
      } catch (error) {
        console.error("Client: Error during createConversation transition:", error);
        alert("创建新对话时出错。");
      }
    });
  };

  return (
    <button 
      onClick={handleNewConversation}
      disabled={isPending}
      className="w-full px-4 py-2 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
    >
      {isPending ? "创建中..." : "+ 新对话"}
    </button>
  );
}
