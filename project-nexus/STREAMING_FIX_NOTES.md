# 流式传输同步修复文档

## 问题分析

### 问题1：其他玩家只看到第一个 chunk
**原因**：
- 使用了状态变量 `streamingContent` 来追踪已发送的内容
- 每次 `setStreamingContent` 更新时，React 状态更新异步，导致 dependency array 中的值与实际不同步
- 使用了 `THROTTLE_MS = 100`，只有每 100ms 更新一次 storage
- 如果流式内容更新速度快于 100ms，中间的 chunk 会被丢弃

**初次修复（仍有问题）**：
- 添加了 `useRef` 来追踪上次发送的内容
- 但 `lastBroadcastTime.current` 的节流仍然会导致 chunk 丢失

### 问题2：消息显示其他玩家自己的名字
**原因**：
- `getDisplayName` 函数只检查 `role` 是否为 'user'，不检查消息实际来自谁
- 所有用户看到的都是自己的名字（通过 `me?.info?.name`）

**解决方案**：
- 将消息发送者信息保存到 Liveblocks storage 的 `userName` 字段
- 修改 `getDisplayName` 从存储的消息元数据中获取发送者名字

## 最终解决方案

### 1. 移除 Throttle，使用 Ref 直接追踪
```typescript
const lastBroadcastContentRef = useRef<string>('');

useEffect(() => {
  if (streamingMsg) {
    const currentContent = /* extract from parts */;
    
    // 每次内容变化时更新存储（无节流）
    if (currentContent !== lastBroadcastContentRef.current) {
      lastBroadcastContentRef.current = currentContent;
      updateStreamingResponse({
        id: streamingMessageId,
        content: currentContent,
      });
    }
  }
}, [messages, streamingMessageId, status]);
```

**优点**：
- 不会丢弃任何 chunk
- React state 和 ref 同步问题解决
- 每次内容变化都立即更新

### 2. 其他玩家监听优化
```typescript
const streamingResponse = useStorage((root) => root.streamingResponse);

useEffect(() => {
  if (streamingResponse && streamingResponse.id !== streamingMessageId) {
    // 这是其他玩家的流式响应
    const streamMessage: UIMessage = {
      id: streamingResponse.id,
      role: 'assistant',
      parts: [{ type: 'text', text: streamingResponse.content }],
      content: streamingResponse.content,
    };
    
    setMessages(prev => {
      const existing = prev.find(m => m.id === streamingResponse.id);
      if (!existing) {
        return [...prev, streamMessage];
      } else {
        return prev.map(m => m.id === streamingResponse.id ? streamMessage : m);
      }
    });
  }
}, [streamingResponse, streamingMessageId]);
```

**优点**：
- 直接监听 Liveblocks storage 变化
- 使用前一个状态来计算新状态，避免闭包问题
- 无需额外的 broadcast event

### 3. 显示正确的发送者名字
```typescript
// storage 中保存发送者信息
saveMessageToStorage({
  id: message.id,
  role: message.role,
  content: message.content,
  fromUserId: me?.id,
  userName: me?.info?.name, // 保存发送者名字
});

// 渲染时获取存储的发送者名字
const getDisplayName = (msg: UIMessage) => {
  if (msg.role === 'user') {
    const storedMsg = storedMessages?.find((m: any) => m.id === msg.id);
    return storedMsg?.userName || me?.info?.name || "Operator";
  }
  return "NEXUS AI";
};
```

### 4. 简化消息目标选择
只保留两个按钮：
- **AI** - 发送给 AI
- **所有人** - 发送给所有玩家

移除了"特定玩家"选项，因为：
- UI 更简洁
- 可通过"@"和"回复"机制实现（未来改进）
- 避免了显示名字问题

## 技术细节

### Liveblocks Storage 更新频率
- **原设计**：每 100ms 更新一次（节流）
- **新设计**：每次内容变化时更新（无节流）
- **理由**：Liveblocks 足够快，且我们的数据很小（文本 chunk）

### 状态管理改进
```
useChat (messages 状态)
    ↓
useEffect 检测变化 → updateStreamingResponse mutation
    ↓
Liveblocks Storage (streamingResponse)
    ↓
其他客户端的 useStorage hook → setMessages
```

## 性能影响

### Liveblocks 配额
- 免费计划：100,000 存储操作/月
- 估算：假设平均 10 个 chunk/秒，每秒 1 个请求
  - 每天：86,400 操作
  - 30天：2,592,000 操作（超过限额）
- **结论**：大规模应用需要付费计划

### 优化建议
1. **批量发送**：每发送 5-10 个字符时更新一次
2. **使用 debounce**：设置 50ms 延迟
3. **压缩数据**：只发送增量 diff

### 当前实现
- 无节流、无批量
- 适合小规模测试（< 10 并发）
- 生产环境建议添加节流

## 测试步骤

1. **打开两个浏览器窗口**
   - A 窗口：玩家1
   - B 窗口：玩家2

2. **玩家1 向 AI 提问**
   - 应该看到完整的流式输出

3. **玩家2 观察**
   - 应该看到流式内容从第一个字到最后
   - 不应该卡住

4. **验证发送者名字**
   - 玩家1 的消息，在玩家2 页面应显示玩家1的名字
   - 不应该显示玩家2的名字

5. **发送给所有人**
   - 玩家1 点击"所有人"按钮
   - 在玩家2 页面应该看到消息

## 已知限制

1. **未实现"@"功能**
   - 未来可添加输入框中的 @ 提及
   - 通过 Markdown 渲染 @username 链接

2. **未实现"回复"功能**
   - 需要在消息结构中添加 `replyTo` 字段
   - 渲染时显示被回复消息的缩小版本

3. **消息通知**
   - 未实现新消息通知
   - 可添加浏览器通知或音频提示

## 日志标记

所有流式相关的日志都标记了 `[GOCCommandCenter]` 或 `[API/GOC-CHAT]`，便于调试：

```
[GOCCommandCenter] Streaming update: {...}
[GOCCommandCenter] Received stream from other player: {...}
[GOCCommandCenter] Stream completion event: ...
[API/GOC-CHAT] Stream finished: {...}
```


