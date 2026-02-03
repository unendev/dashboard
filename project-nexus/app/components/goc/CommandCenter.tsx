/**
 * GOC Command Center - AI 聊天界面 (Refactored)
 * 
 * 架构说明：
 * - 逻辑层：useGocChat Hook (封装了 Liveblocks, AI SDK, 同步逻辑)
 * - UI 层：ChatHeader, MessageList, ChatInput
 */

"use client";

import { useState, useEffect, useRef } from "react";
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
    sharedMessages,

    // Config State
    aiConfig,
    updateAiConfig,
    aiModeEnabled,
    setAiModeEnabled,

    // Actions
    handleSendMessage,
    handleDeleteMessage,
    getUIMessageContent,
  } = useGocChat();

  // 自动隐藏刘海逻辑（仅移动端）
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isInputVisible, setIsInputVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind 的 md 断点
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return; // 桌面端不启用自动隐藏
    
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      const scrollingDown = currentScrollY > lastScrollY.current;
      const scrollingUp = currentScrollY < lastScrollY.current;

      // 向上滑动（scrollingUp）：隐藏刘海
      if (scrollingUp && currentScrollY > 50) {
        setIsHeaderVisible(false);
        setIsInputVisible(false);
      }
      // 向下滑动（scrollingDown）：显示刘海
      else if (scrollingDown) {
        setIsHeaderVisible(true);
        setIsInputVisible(true);
      }
      // 滚动到顶部：显示刘海
      else if (currentScrollY < 10) {
        setIsHeaderVisible(true);
        setIsInputVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] relative">
      <div
        className={`${isMobile ? 'fixed top-0 left-0 right-0' : 'relative'} z-30 transition-transform duration-300 ease-in-out ${
          isMobile && !isHeaderVisible ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <ChatHeader
          others={others}
          me={me}
          aiConfig={aiConfig}
          updateAiConfig={updateAiConfig}
        />
      </div>

      <MessageList
        ref={scrollContainerRef}
        messages={displayMessages}
        status={status}
        me={me}
        others={others}
        getUIMessageContent={getUIMessageContent}
        onDeleteMessage={handleDeleteMessage}
        sharedMessages={sharedMessages || []}
      />

      <div
        className={`${isMobile ? 'fixed bottom-0 left-0 right-0' : 'relative'} z-20 transition-transform duration-300 ease-in-out ${
          isMobile && !isInputVisible ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <ChatInput
          inputRef={inputRef}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          aiModeEnabled={aiModeEnabled}
          setAiModeEnabled={setAiModeEnabled}
        />
      </div>
    </div>
  );
}
