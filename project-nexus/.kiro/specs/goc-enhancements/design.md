# GOC 系统增强功能设计文档

## 概述

本设计文档详细说明了 GOC 系统的5个增强功能的实现方案。这些功能旨在改进系统效率、用户体验和管理能力。

## 架构

### 当前架构回顾
```
前端 (CommandCenter)
    ↓
useChat hook (Vercel AI SDK)
    ↓
POST /api/goc-chat
    ↓
DeepSeek API
    ↓
流式响应 → 前端处理 → Liveblocks 更新
```

### 增强后架构
```
前端 (CommandCenter)
    ↓
useChat hook + 模型选择
    ↓
POST /api/goc-chat (带 model 参数)
    ↓
DeepSeek / Gemini API
    ↓
流式响应 → 分批广播到 Liveblocks
    ↓
所有客户端实时同步
```

## 组件和接口

### 1. 笔记优化模块

#### 前端变更 (CommandCenter.tsx)
```typescript
// 追踪上一次发送的笔记
const [lastSentNotes, setLastSentNotes] = useState<string>("");

// 检查笔记是否变化
const hasNotesChanged = notes !== lastSentNotes;

// 发送消息时
const onSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  const body: any = {
    players: playerList,
    mode: aiMode
  };
  
  // 仅在笔记变化时发送
  if (hasNotesChanged) {
    body.notes = notes;
    setLastSentNotes(notes);
  }
  
  sendMessage({ role: 'user', text: localInput }, { body });
};
```

#### 后端变更 (route.ts)
```typescript
export async function POST(req: Request) {
  const { messages, notes, players, mode } = await req.json();
  
  // notes 可能为 undefined，使用默认值
  const notesContext = notes || "(No notes provided)";
  
  const systemPrompt = `...
Current Field Notes:
"""
${notesContext}
"""
  `;
}
```

### 2. SVG 头像与固定 Hash ID

#### 工具函数 (lib/user-utils.ts)
```typescript
import crypto from 'crypto';

/**
 * 基于用户名生成固定的 Hash ID
 */
export function generateUserHashId(userName: string): string {
  const hash = crypto
    .createHash('md5')
    .update(userName.toLowerCase())
    .digest('hex')
    .substring(0, 8);
  return `user-${hash}`;
}

/**
 * 基于用户名生成确定性 SVG 头像
 */
export function generateSVGAvatar(userName: string): string {
  const hash = crypto
    .createHash('md5')
    .update(userName.toLowerCase())
    .digest('hex');
  
  // 从 hash 提取颜色
  const hue = parseInt(hash.substring(0, 6), 16) % 360;
  const saturation = 70 + (parseInt(hash.substring(6, 12), 16) % 30);
  const lightness = 50 + (parseInt(hash.substring(12, 18), 16) % 20);
  
  const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  
  // 获取用户名首字母
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  return `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="${bgColor}"/>
      <text x="20" y="26" font-size="16" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">
        ${initials}
      </text>
    </svg>
  `;
}

/**
 * 将 SVG 字符串转换为 Data URL
 */
export function svgToDataUrl(svgString: string): string {
  const encoded = encodeURIComponent(svgString.trim());
  return `data:image/svg+xml;utf8,${encoded}`;
}
```

#### 认证变更 (app/api/liveblocks-auth/route.ts)
```typescript
import { generateUserHashId, generateSVGAvatar, svgToDataUrl } from '@/lib/user-utils';

export async function POST(request: Request) {
  const { room, name } = await request.json();
  
  // 使用 Hash ID 替代随机 ID
  const userId = generateUserHashId(name);
  
  // 生成 SVG 头像
  const svgAvatar = generateSVGAvatar(name);
  const avatarUrl = svgToDataUrl(svgAvatar);
  
  const user = {
    id: userId,
    info: {
      name: name,
      color: "#" + Math.floor(Math.random()*16777215).toString(16),
      picture: avatarUrl,  // 使用 SVG Data URL
    }
  };
  
  const session = liveblocks.prepareSession(userId, {
    userInfo: { ...user.info }
  });
  
  session.allow(room, session.FULL_ACCESS);
  
  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
```

### 3. 管理界面（MVP）

#### 新路由 (app/admin/rooms/page.tsx)
```typescript
"use client";

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";

interface Room {
  id: string;
  createdAt: number;
  playerCount: number;
  lastActivity: number;
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 或 API 获取房间列表
    // MVP: 从 localStorage 读取
    const storedRooms = localStorage.getItem('goc_rooms');
    if (storedRooms) {
      const parsed = JSON.parse(storedRooms);
      setRooms(parsed.sort((a: Room, b: Room) => b.createdAt - a.createdAt));
    }
    setLoading(false);
  }, []);

  return (
    <div className="h-screen w-full bg-[#0a0a0a] flex">
      {/* 左侧列表 */}
      <div className="w-1/3 border-r border-zinc-800 overflow-y-auto">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-xl font-bold text-cyan-400">ROOMS</h1>
        </div>
        
        {loading ? (
          <div className="p-4 text-zinc-500">Loading...</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedRoomId === room.id
                    ? 'bg-zinc-800 border-l-2 border-cyan-500'
                    : 'hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-cyan-400">{room.id}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {new Date(room.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      Players: {room.playerCount}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 p-4">
        {selectedRoomId ? (
          <RoomDetail roomId={selectedRoomId} />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500">
            Select a room to view details
          </div>
        )}
      </div>
    </div>
  );
}

function RoomDetail({ roomId }: { roomId: string }) {
  // MVP: 简单显示房间信息
  return (
    <div>
      <h2 className="text-lg font-bold text-cyan-400 mb-4">{roomId}</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-400 mb-2">Notes</h3>
          <div className="bg-zinc-900 p-3 rounded text-sm text-zinc-300 max-h-40 overflow-y-auto">
            (Notes would be displayed here)
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-400 mb-2">Players</h3>
          <div className="bg-zinc-900 p-3 rounded text-sm text-zinc-300">
            (Player list would be displayed here)
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4. 流式响应同步

#### 后端变更 (route.ts)
```typescript
export async function POST(req: Request) {
  const { messages, notes, players, mode } = await req.json();
  
  // 创建自定义流处理
  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt,
    messages,
    temperature: 0.7,
    tools: { /* ... */ },
  });

  // 获取原始流
  const stream = 'toDataStream' in result ? result.toDataStream() : result.stream;
  
  // 包装流以实现分批广播
  const wrappedStream = wrapStreamForBatching(stream);
  
  return new Response(wrappedStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    }
  });
}

/**
 * 包装流以实现分批广播
 * 前 20 字立即发送，之后每 50 字发送一次
 */
function wrapStreamForBatching(stream: ReadableStream) {
  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      let buffer = '';
      let charCount = 0;
      let firstBatchSent = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += value;
          charCount += value.length;

          // 前 20 字立即发送
          if (!firstBatchSent && charCount >= 20) {
            controller.enqueue(buffer);
            firstBatchSent = true;
            buffer = '';
            charCount = 0;
          }
          // 之后每 50 字发送一次
          else if (firstBatchSent && charCount >= 50) {
            controller.enqueue(buffer);
            buffer = '';
            charCount = 0;
          }
        }

        // 发送剩余内容
        if (buffer) {
          controller.enqueue(buffer);
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    }
  });
}
```

#### 前端变更 (CommandCenter.tsx)
```typescript
// 使用 Liveblocks 广播流式更新
const broadcastStreamingUpdate = useMutation(
  ({ storage }, { content, isComplete }: { content: string; isComplete: boolean }) => {
    storage.set('streamingResponse', {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      userName: 'NEXUS AI',
      createdAt: Date.now(),
      isComplete,
    });
  },
  []
);

// 在 onToolCall 中或消息处理中调用
const handleStreamingChunk = (chunk: string) => {
  broadcastStreamingUpdate({ content: chunk, isComplete: false });
};

const handleStreamingComplete = (fullContent: string) => {
  broadcastStreamingUpdate({ content: fullContent, isComplete: true });
};
```

### 5. 多模型支持

#### 前端变更 (CommandCenter.tsx)
```typescript
const [aiModel, setAiModel] = useState<'deepseek' | 'gemini'>(() => {
  const saved = localStorage.getItem('goc_ai_model');
  return (saved as 'deepseek' | 'gemini') || 'deepseek';
});

// 保存模型选择
useEffect(() => {
  localStorage.setItem('goc_ai_model', aiModel);
}, [aiModel]);

// 在发送消息时传递模型
const onSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  sendMessage({ role: 'user', text: localInput }, {
    body: {
      notes: hasNotesChanged ? notes : undefined,
      players: playerList,
      mode: aiMode,
      model: aiModel,  // ← 新增
    }
  });
};

// UI 中添加模型选择按钮
<div className="flex justify-center gap-2">
  <button
    onClick={() => setAiModel('deepseek')}
    className={cn(
      "px-3 py-1 rounded text-xs font-bold",
      aiModel === 'deepseek'
        ? "bg-blue-900 border border-blue-500 text-blue-100"
        : "bg-zinc-900 border border-zinc-800 text-zinc-500"
    )}
  >
    DeepSeek
  </button>
  <button
    onClick={() => setAiModel('gemini')}
    className={cn(
      "px-3 py-1 rounded text-xs font-bold",
      aiModel === 'gemini'
        ? "bg-purple-900 border border-purple-500 text-purple-100"
        : "bg-zinc-900 border border-zinc-800 text-zinc-500"
    )}
  >
    Gemini
  </button>
</div>
```

#### 后端变更 (route.ts)
```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const deepseek = createOpenAI({
  apiKey: env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_API_KEY,
});

export async function POST(req: Request) {
  const { messages, notes, players, mode, model = 'deepseek' } = await req.json();

  // 选择模型
  let selectedModel;
  if (model === 'gemini') {
    selectedModel = google('gemini-2.0-flash-exp');
  } else {
    selectedModel = deepseek('deepseek-chat');
  }

  const result = streamText({
    model: selectedModel,
    system: systemPrompt,
    messages,
    temperature: 0.7,
    tools: { /* ... */ },
  });

  // ... 返回流式响应
}
```

## 数据模型

### Liveblocks Storage 更新
```typescript
{
  // ... 现有字段
  streamingResponse: {
    id: string;
    role: 'assistant';
    content: string;
    userName: string;
    createdAt: number;
    isComplete: boolean;  // ← 新增
  } | null;
}
```

### 房间元数据（localStorage）
```typescript
interface RoomMetadata {
  id: string;
  createdAt: number;
  playerCount: number;
  lastActivity: number;
}
```

## 错误处理

### Gemini 不可用
```typescript
try {
  selectedModel = google('gemini-2.0-flash-exp');
} catch (error) {
  console.error('Gemini unavailable, falling back to DeepSeek');
  selectedModel = deepseek('deepseek-chat');
  // 通知前端
}
```

## 测试策略

### 单元测试
- 测试 `generateUserHashId` 的确定性
- 测试 `generateSVGAvatar` 的颜色生成
- 测试笔记变化检测逻辑

### 集成测试
- 测试流式响应的分批发送
- 测试 Liveblocks 广播
- 测试模型切换

### 手动测试
- 验证 SVG 头像显示
- 验证管理界面列表排序
- 验证流式同步体验

