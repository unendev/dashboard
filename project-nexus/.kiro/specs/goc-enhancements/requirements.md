# GOC 系统增强功能需求文档

## 介绍

本文档定义了 GOC（Game Operations Center）系统的5个核心增强功能，旨在改进用户体验、系统效率和管理能力。这些功能包括：优化笔记传输、改进用户识别、添加管理界面、实现流式同步和启用多模型支持。

## 术语表

- **GOC**: Game Operations Center，游戏运营中心
- **Liveblocks**: 实时协作框架，用于多人同步
- **Note**: 共享笔记，所有玩家可见
- **Hash ID**: 基于用户名的固定标识符
- **SVG Avatar**: 可扩展矢量图形头像
- **流式传输**: 实时流式响应，分块发送
- **半流式**: 分批次发送流式数据，而非真正的流式
- **Gemini**: Google 的 AI 模型
- **DeepSeek**: 当前使用的 AI 模型

## 需求

### 需求 1: 优化笔记传输

**用户故事**: 作为系统开发者，我希望减少不必要的网络传输，以提高系统效率。

#### 接受标准

1. WHEN 用户发送消息 THEN THE 系统 SHALL 仅在笔记内容变化时才发送笔记到后端
2. WHEN 笔记未变化 THEN THE 系统 SHALL 不在请求体中包含笔记数据
3. WHEN AI 使用 updateNote 工具 THEN THE 系统 SHALL 立即更新本地笔记状态
4. WHEN 笔记更新后 THEN THE 系统 SHALL 在下一次消息中发送新的笔记内容

---

### 需求 2: SVG 头像与固定用户标识

**用户故事**: 作为玩家，我希望有一致的用户身份和简洁的头像显示。

#### 接受标准

1. WHEN 玩家输入用户名 THEN THE 系统 SHALL 基于用户名生成固定的 Hash ID
2. WHEN 玩家重新进入房间 THEN THE 系统 SHALL 使用相同的 Hash ID（如果用户名相同）
3. WHEN 玩家进入房间 THEN THE 系统 SHALL 为其生成基于用户名的 SVG 头像
4. WHEN SVG 头像生成 THEN THE 系统 SHALL 使用确定性算法确保相同用户名生成相同头像
5. WHEN 显示用户信息 THEN THE 系统 SHALL 使用 SVG 头像而不是外部 URL

---

### 需求 3: 聊天室管理界面

**用户故事**: 作为管理员，我希望能够查看所有聊天室的列表，并能够查看每个房间的详细信息。

#### 接受标准

1. WHEN 管理员访问 /admin/rooms THEN THE 系统 SHALL 显示所有聊天室列表
2. WHEN 显示聊天室列表 THEN THE 系统 SHALL 按创建时间倒序排列（最新的在前）
3. WHEN 聊天室列表显示 THEN THE 系统 SHALL 显示房间 ID、创建时间、在线玩家数
4. WHEN 管理员点击列表中的房间 THEN THE 系统 SHALL 在右侧展开显示房间详细信息
5. WHEN 房间详细信息展开 THEN THE 系统 SHALL 显示房间的笔记、任务列表和消息历史
6. WHERE 用户不是管理员 THEN THE 系统 SHALL 拒绝访问 /admin/rooms 页面

---

### 需求 4: 流式响应同步

**用户故事**: 作为玩家，我希望在 AI 生成回答时能够实时看到其他玩家也在接收相同的内容。

#### 接受标准

1. WHEN AI 开始生成响应 THEN THE 系统 SHALL 立即通过 Liveblocks 广播"AI 正在思考"状态
2. WHEN AI 生成前 20 个字符 THEN THE 系统 SHALL 通过 Liveblocks 广播初始内容
3. WHEN AI 继续生成 THEN THE 系统 SHALL 每累积 50 个字符时通过 Liveblocks 广播一次更新
4. WHEN AI 完成生成 THEN THE 系统 SHALL 通过 Liveblocks 广播完整的最终消息
5. WHEN 其他玩家接收到广播 THEN THE 系统 SHALL 实时更新他们的消息显示
6. WHEN 流式传输完成 THEN THE 系统 SHALL 所有玩家都能看到完整的 AI 回答

---

### 需求 5: 多模型支持（Gemini）

**用户故事**: 作为用户，我希望能够在 DeepSeek 和 Gemini 之间切换 AI 模型。

#### 接受标准

1. WHEN 用户在 CommandCenter 中 THEN THE 系统 SHALL 显示模型选择按钮（DeepSeek / Gemini）
2. WHEN 用户选择 Gemini THEN THE 系统 SHALL 在后续请求中使用 Gemini 模型
3. WHEN 用户选择 DeepSeek THEN THE 系统 SHALL 在后续请求中使用 DeepSeek 模型
4. WHEN 后端接收请求 THEN THE 系统 SHALL 根据 model 参数选择对应的 AI 模型
5. WHEN Gemini 模型不可用 THEN THE 系统 SHALL 显示错误提示并回退到 DeepSeek
6. WHEN 用户切换模型 THEN THE 系统 SHALL 保存用户的模型偏好到 localStorage

---

## 实现优先级

1. **高优先级**: 需求 1（笔记优化）、需求 2（头像与 ID）
2. **中优先级**: 需求 5（Gemini 支持）
3. **低优先级**: 需求 3（管理界面 MVP）、需求 4（流式同步）

