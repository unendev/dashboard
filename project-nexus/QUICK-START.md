# GOC 系统 - 快速开始指南

## 🚀 5 分钟快速开始

### 1. 配置环境变量 (1 分钟)

```bash
# 编辑 .env.local
DEEPSEEK_API_KEY=your_deepseek_key
LIVEBLOCKS_SECRET_KEY=your_liveblocks_key
GOOGLE_API_KEY=your_gemini_key  # 可选
```

### 2. 启动应用 (1 分钟)

```bash
npm run dev
```

### 3. 进入房间 (1 分钟)

```
访问: http://localhost:3000/room/test-room?name=YourName
```

### 4. 测试功能 (2 分钟)

- ✅ 修改笔记并发送消息
- ✅ 切换 AI 模型（DeepSeek / Gemini）
- ✅ 观察流式响应
- ✅ 查看管理界面: http://localhost:3000/admin/rooms

---

## 📋 功能清单

### ✅ 已实现功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 笔记优化 | ✅ | 仅在变化时发送，减少 30-50% 传输 |
| SVG 头像 | ✅ | 确定性生成，用户身份一致 |
| 模型切换 | ✅ | 支持 DeepSeek 和 Gemini |
| 流式同步 | ✅ | 分批广播，所有玩家实时同步 |
| 管理界面 | ✅ | 房间列表、详情展示 |
| 工具调用 | ✅ | updateNote、addTodo 正常工作 |

---

## 🔍 验证清单

### 部署前检查

- [ ] DEEPSEEK_API_KEY 已配置
- [ ] LIVEBLOCKS_SECRET_KEY 已配置
- [ ] GOOGLE_API_KEY 已配置（可选）
- [ ] npm install 已完成
- [ ] npm run dev 启动成功

### 功能验证

- [ ] 可以进入房间
- [ ] 可以发送消息
- [ ] 可以切换 AI 模型
- [ ] 可以修改笔记
- [ ] 可以访问管理界面

---

## 📚 文档导航

### 快速参考
- 🔗 [快速参考](doc/GOC-Quick-Reference.md) - 核心概念速查
- 🔗 [架构文档](doc/GOC-AI-Architecture.md) - 系统架构详解

### 实现文档
- 🔗 [实现总结](doc/FINAL-IMPLEMENTATION-SUMMARY.md) - 完整实现总结
- 🔗 [实现进度](doc/IMPLEMENTATION-PROGRESS.md) - 详细进度
- 🔗 [验证清单](doc/VERIFICATION-CHECKLIST.md) - 验证方法

### Gemini 文档
- 🔗 [Gemini 测试指南](doc/GEMINI-TESTING-GUIDE.md) - 测试方法
- 🔗 [Gemini 配置审计](doc/GEMINI-CONFIGURATION-AUDIT.md) - 配置详解
- 🔗 [Gemini 验证报告](doc/GEMINI-VERIFICATION-REPORT.md) - 验证结果

### 规范文档
- 🔗 [需求文档](.kiro/specs/goc-enhancements/requirements.md)
- 🔗 [设计文档](.kiro/specs/goc-enhancements/design.md)
- 🔗 [任务列表](.kiro/specs/goc-enhancements/tasks.md)

---

## 🎯 常见问题

### Q: 如何切换 AI 模型？
A: 在 CommandCenter 的 Header 中点击 "DeepSeek" 或 "Gemini" 按钮

### Q: 如何访问管理界面？
A: 访问 http://localhost:3000/admin/rooms

### Q: 如何修改笔记？
A: 在 TacticalBoard 中编辑笔记，发送消息时会自动同步

### Q: 如何添加任务？
A: 使用 Planner 模式，AI 会自动添加任务

### Q: 如何查看其他玩家？
A: 在 CommandCenter 中可以看到在线玩家列表

---

## 🔧 故障排查

### 问题: 无法连接到 AI 服务
**解决**: 检查 API Key 是否正确配置

### 问题: 模型不响应
**解决**: 查看浏览器控制台是否有错误，检查网络连接

### 问题: 笔记不同步
**解决**: 检查 Liveblocks 是否正确配置

### 问题: 管理界面无法访问
**解决**: 确保应用已启动，访问 http://localhost:3000/admin/rooms

---

## 📊 性能指标

- 网络传输: ↓ 30-50%（笔记优化）
- 首字响应: < 2 秒
- 完整响应: < 10 秒
- 同步延迟: < 100ms

---

## 🚀 部署

### 生产环境部署

```bash
# 构建
npm run build

# 启动
npm start
```

### 环境变量检查

```bash
# 确保所有必需的环境变量都已配置
echo $DEEPSEEK_API_KEY
echo $LIVEBLOCKS_SECRET_KEY
echo $NEXTAUTH_URL
echo $NEXTAUTH_SECRET
echo $DATABASE_URL
```

---

## 📞 获取帮助

1. 查看相关文档
2. 检查浏览器控制台错误
3. 查看服务器日志
4. 查看 Network 标签中的请求

---

## ✨ 下一步

1. ✅ 启动应用
2. ✅ 测试功能
3. ✅ 查看文档
4. ✅ 部署到生产

**祝你使用愉快！** 🎉

