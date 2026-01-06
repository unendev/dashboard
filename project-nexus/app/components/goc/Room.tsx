"use client";

import { ReactNode, useEffect } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

export function Room({ children, roomId, userName }: { children: ReactNode; roomId: string; userName?: string }) {
  // 追踪房间元数据用于管理界面
  useEffect(() => {
    const trackRoomMetadata = () => {
      // 获取或初始化房间列表
      const storedRooms = localStorage.getItem('goc_rooms_metadata');
      let rooms = [];
      
      if (storedRooms) {
        try {
          rooms = JSON.parse(storedRooms);
        } catch (error) {
          console.error('Failed to parse rooms metadata:', error);
        }
      }

      // 检查房间是否已存在
      const existingRoomIndex = rooms.findIndex((r: any) => r.id === roomId);
      const now = Date.now();

      if (existingRoomIndex >= 0) {
        // 更新现有房间的最后活动时间
        rooms[existingRoomIndex].lastActivity = now;
      } else {
        // 添加新房间
        rooms.push({
          id: roomId,
          createdAt: now,
          playerCount: 1,
          lastActivity: now,
        });
      }

      // 保存更新后的房间列表
      localStorage.setItem('goc_rooms_metadata', JSON.stringify(rooms));
    };

    trackRoomMetadata();
  }, [roomId]);

  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        const response = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ room, name: userName }),
        });
        return await response.json();
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{}}
        initialStorage={{
          aiConfig: new LiveObject({
            provider: "deepseek",
            modelId: "deepseek-chat",
            aiMode: "encyclopedia",
            thinkingEnabled: true,
          }),
          todos: new LiveList([]),
          notes: "## Mission Briefing\n\n- Objective: Survive\n- Day: 1",
          playerNotes: new LiveMap(),
          messages: new LiveList([]),
          streamingResponse: null,
          currentUrl: null,
          latestIntel: null,
        }}
      >
        <ClientSideSuspense fallback={
          <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-cyan-400 text-sm">连接中...</div>
            </div>
          </div>
        }>
          <RoomDataTracker roomId={roomId}>
            {children}
          </RoomDataTracker>
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

/**
 * 追踪房间数据用于管理界面
 */
function RoomDataTracker({ roomId, children }: { roomId: string; children: ReactNode }) {
  useEffect(() => {
    // 定期保存房间数据到 localStorage
    const interval = setInterval(() => {
      try {
        // 获取当前房间的数据
        const roomData = {
          createdAt: Date.now(),
          lastActivity: Date.now(),
          notes: localStorage.getItem(`goc_room_${roomId}_notes`) || '',
          todos: JSON.parse(localStorage.getItem(`goc_room_${roomId}_todos`) || '[]'),
          players: JSON.parse(localStorage.getItem(`goc_room_${roomId}_players`) || '[]'),
        };

        localStorage.setItem(`goc_room_${roomId}`, JSON.stringify(roomData));
      } catch (error) {
        console.error('Failed to track room data:', error);
      }
    }, 5000); // 每 5 秒更新一次

    return () => clearInterval(interval);
  }, [roomId]);

  return <>{children}</>;
}
