# GOC 系统增强功能实现计划

## 1. 创建用户工具函数库

- [x] 1.1 创建 `lib/user-utils.ts` 文件
  - 实现 `generateUserHashId()` 函数，基于用户名生成固定 MD5 Hash ID
  - 实现 `generateSVGAvatar()` 函数，基于用户名生成确定性 SVG 头像
  - 实现 `svgToDataUrl()` 函数，将 SVG 转换为 Data URL
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 1.2 编写用户工具函数的单元测试
  - 测试 Hash ID 的确定性（相同输入产生相同输出）
  - 测试 SVG 头像的确定性
  - 测试 Data URL 的正确格式
  - _Requirements: 2.1, 2.2_

---

## 2. 优化笔记传输逻辑

- [x] 2.1 修改 `app/components/goc/CommandCenter.tsx`
  - 添加 `lastSentNotes` 状态追踪
  - 实现 `hasNotesChanged` 检查逻辑
  - 修改 `onSubmit` 函数，仅在笔记变化时发送
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.2 修改 `app/api/goc-chat/route.ts`
  - 处理可选的 `notes` 参数
  - 使用默认值当 notes 为 undefined 时
  - _Requirements: 1.1, 1.2_

- [ ]* 2.3 编写笔记优化的集成测试
  - 测试笔记变化检测
  - 测试请求体中的笔记字段
  - _Requirements: 1.1, 1.2_

---

## 3. 实现 SVG 头像与固定 ID

- [x] 3.1 修改 `app/api/liveblocks-auth/route.ts`
  - 导入 `generateUserHashId` 和 `generateSVGAvatar` 函数
  - 替换随机 ID 生成为 Hash ID
  - 替换随机头像为 SVG 头像
  - 使用 `svgToDataUrl` 转换 SVG
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3.2 更新 `liveblocks.config.ts` 类型定义
  - 确保 UserMeta 类型支持 SVG Data URL
  - _Requirements: 2.5_

- [ ]* 3.3 编写 SVG 头像的视觉测试
  - 验证头像在不同用户名下的显示
  - 验证颜色的多样性
  - _Requirements: 2.3, 2.4_

---

## 4. 实现多模型支持（Gemini）

- [x] 4.1 修改 `app/api/goc-chat/route.ts`
  - 导入 `createGoogleGenerativeAI`
  - 初始化 Google Generative AI 客户端
  - 添加模型选择逻辑（根据 `model` 参数）
  - 实现 DeepSeek 和 Gemini 的模型选择
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4.2 修改 `app/components/goc/CommandCenter.tsx`
  - 添加 `aiModel` 状态（'deepseek' | 'gemini'）
  - 从 localStorage 读取保存的模型偏好
  - 添加模型选择按钮到 UI
  - 在 `onSubmit` 中传递 `model` 参数
  - 保存模型选择到 localStorage
  - _Requirements: 5.1, 5.2, 5.6_

- [x] 4.3 添加错误处理和回退逻辑
  - 当 Gemini 不可用时回退到 DeepSeek
  - 在前端显示错误提示
  - _Requirements: 5.5_

- [ ]* 4.4 编写多模型支持的集成测试
  - 测试 DeepSeek 模型选择
  - 测试 Gemini 模型选择
  - 测试模型切换
  - 测试 localStorage 持久化
  - _Requirements: 5.1, 5.2, 5.6_

---

## 5. 实现流式响应同步

- [ ] 5.1 修改 `app/api/goc-chat/route.ts`
  - 实现 `wrapStreamForBatching()` 函数
  - 前 20 字立即发送
  - 之后每 50 字发送一次
  - 完成时发送完整内容
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5.2 修改 `app/components/goc/CommandCenter.tsx`
  - 创建 `broadcastStreamingUpdate` mutation
  - 实现流式更新的 Liveblocks 广播
  - 处理流式块的接收和显示
  - _Requirements: 4.1, 4.5, 4.6_

- [ ] 5.3 更新 `liveblocks.config.ts`
  - 添加 `isComplete` 字段到 `streamingResponse`
  - _Requirements: 4.4_

- [ ]* 5.4 编写流式同步的集成测试
  - 测试分批发送逻辑
  - 测试 Liveblocks 广播
  - 测试多客户端同步
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

---

## 6. 实现管理界面（MVP）

- [ ] 6.1 创建 `app/admin/rooms/page.tsx`
  - 实现房间列表显示
  - 按创建时间倒序排列
  - 显示房间 ID、创建时间、在线玩家数
  - 实现点击展开详情功能
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 6.2 实现房间详情展示
  - 显示房间笔记
  - 显示任务列表
  - 显示消息历史（MVP 可简化）
  - _Requirements: 3.5_

- [ ] 6.3 添加管理员权限检查
  - 实现简单的权限验证（基于 URL 密钥或环境变量）
  - 未授权用户重定向到首页
  - _Requirements: 3.6_

- [ ] 6.4 修改 `Room.tsx` 以支持房间元数据追踪
  - 在 localStorage 中记录房间创建时间
  - 追踪在线玩家数
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 6.5 编写管理界面的集成测试
  - 测试房间列表排序
  - 测试详情展开
  - 测试权限检查
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

## 7. 集成和验证

- [ ] 7.1 确保所有测试通过
  - 运行单元测试
  - 运行集成测试
  - 检查代码覆盖率
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ] 7.2 手动测试所有功能
  - 测试笔记优化
  - 测试 SVG 头像显示
  - 测试模型切换
  - 测试流式同步
  - 测试管理界面
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ] 7.3 性能验证
  - 验证 Liveblocks 额度使用
  - 验证网络传输优化
  - _Requirements: 1.1, 4.1_

---

## 实现顺序建议

1. **第一阶段**（高优先级）
   - 任务 1: 创建用户工具函数库
   - 任务 2: 优化笔记传输
   - 任务 3: 实现 SVG 头像与固定 ID

2. **第二阶段**（中优先级）
   - 任务 4: 实现多模型支持

3. **第三阶段**（低优先级）
   - 任务 5: 实现流式响应同步
   - 任务 6: 实现管理界面

4. **第四阶段**（验证）
   - 任务 7: 集成和验证

