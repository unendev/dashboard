/**
 * GOC Command Center - AI 聊天界面 (Refactored)
 * 
 * 架构说明：
 * - 逻辑层：useGocChat Hook (封装了 Liveblocks, AI SDK, 同步逻辑)
 * - UI 层：ChatHeader, MessageList, ChatInput
 */

"use client";

import { useGocChat } from "@/app/hooks/goc/use-goc-chat";
import { ChatHeader } from "./command-center/ChatHeader";
import { MessageList } from "./command-center/MessageList";
import { ChatInput } from "./command-center/ChatInput";

export default function CommandCenter() {
  const {
    // State
    displayMessages,
    status,
    isLoading,
    inputRef,
    me,
    others,
    
    // Config State
    aiConfig,
    updateAiConfig,
    aiModeEnabled,
    setAiModeEnabled,
    
    // Actions
    handleSendMessage,
    getUIMessageContent,
  } = useGocChat();

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] relative">
      <ChatHeader
        others={others}
        me={me}
        aiConfig={aiConfig}
        updateAiConfig={updateAiConfig}
      />

      <MessageList
        messages={displayMessages}
        status={status}
        me={me}
        others={others}
        getUIMessageContent={getUIMessageContent}
      />

      <ChatInput
        inputRef={inputRef}
        onSubmit={handleSendMessage}
        isLoading={isLoading}
        aiModeEnabled={aiModeEnabled}
        setAiModeEnabled={setAiModeEnabled}
      />
    </div>
  );
}
