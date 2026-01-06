# GOC 系统增强功能验证清单

## 🔍 代码验证

### ✅ 文件检查
- [x] `lib/user-utils.ts` - 已创建，包含所有必需函数
- [x] `app/api/liveblocks-auth/route.ts` - 已修改，使用 Hash ID 和 SVG 头像
- [x] `app/api/goc-chat/route.ts` - 已修改，支持 Gemini 和可选 notes
- [x] `app/components/goc/CommandCenter.tsx` - 已修改，添加笔记优化和模型选择

### ✅ 类型检查
- [x] `lib/user-utils.ts` - 无诊断错误
- [x] `app/api/liveblocks-auth/route.ts` - 无诊断错误
- [x] `app/api/goc-chat/route.ts` - 无诊断错误
- [x] `app/components/goc/CommandCenter.tsx` - 无诊断错误

---

## 🧪 功能验证

### 1. 笔记传输优化

**测试步骤**:
```
1. 打开浏览器开发者工具 → Network 标签
2. 进入房间
3. 修改笔记内容
4. 发送消息
5. 观察请求体中是否包含 "notes" 字段
6. 再次发送消息（不修改笔记）
7. 观察请求体中是否不包含 "notes" 字段
```

**预期结果**:
- ✓ 笔记变化时，请求体包含 notes
- ✓ 笔记不变时，请求体不包含 notes
- ✓ 后端正确处理可选的 notes 参数

**验证命令**:
```bash
# 查看请求体
# 在浏览器开发者工具中查看 Network → goc-chat 请求
# 检查 Request Payload 中是否有 notes 字段
```

---

### 2. SVG 头像与固定 ID

**测试步骤**:
```
1. 进入房间，输入用户名 "Alice"
2. 观察头像显示（应该是 SVG，显示 "A"）
3. 记录用户 ID（应该是 user-{hash}）
4. 刷新页面，重新进入房间，输入相同用户名 "Alice"
5. 观察头像是否相同
6. 观察用户 ID 是否相同
7. 尝试不同用户名 "Bob"，观察头像是否不同
```

**预期结果**:
- ✓ 头像显示为 SVG（不是外部 URL）
- ✓ 相同用户名的头像相同
- ✓ 相同用户名的 ID 相同
- ✓ 不同用户名的头像不同

**验证命令**:
```bash
# 在浏览器控制台检查
# 1. 查看头像 URL 是否为 data:image/svg+xml
# 2. 查看用户 ID 格式是否为 user-{8位hash}
```

---

### 3. 多模型支持（Gemini）

**测试步骤**:
```
1. 进入房间
2. 观察 Header 中是否有 "DeepSeek" 和 "Gemini" 按钮
3. 点击 "Gemini" 按钮
4. 观察按钮样式是否改变（应该变为紫色）
5. 发送消息
6. 观察后端是否使用 Gemini 模型
7. 刷新页面
8. 观察模型选择是否保持为 "Gemini"
9. 点击 "DeepSeek" 按钮
10. 发送消息
11. 观察后端是否使用 DeepSeek 模型
```

**预期结果**:
- ✓ 模型选择按钮可见且可点击
- ✓ 按钮样式清晰显示当前选择
- ✓ 模型选择保存到 localStorage
- ✓ 刷新后模型选择保持
- ✓ 后端根据选择使用对应模型

**验证命令**:
```bash
# 在浏览器控制台检查
# 1. localStorage.getItem('goc_ai_model') 应该返回 'gemini' 或 'deepseek'
# 2. 查看网络请求中的 body 是否包含 "model": "gemini"
```

---

### 4. 用户工具函数

**测试步骤**:
```javascript
// 在浏览器控制台运行
import { generateUserHashId, generateSVGAvatar, generateAvatarDataUrl } from '@/lib/user-utils';

// 测试 Hash ID 确定性
const id1 = generateUserHashId('Alice');
const id2 = generateUserHashId('Alice');
console.log('Hash ID 确定性:', id1 === id2); // 应该为 true

// 测试 SVG 头像
const svg = generateSVGAvatar('Bob');
console.log('SVG 包含 svg 标签:', svg.includes('<svg')); // 应该为 true
console.log('SVG 包含首字母:', svg.includes('B')); // 应该为 true

// 测试 Data URL
const dataUrl = generateAvatarDataUrl('Charlie');
console.log('Data URL 格式:', dataUrl.startsWith('data:image/svg+xml')); // 应该为 true
```

**预期结果**:
- ✓ Hash ID 确定性：相同输入产生相同输出
- ✓ SVG 生成：包含有效的 SVG 标签和首字母
- ✓ Data URL：格式正确，可用于 img src

---

## 🚀 集成验证

### 完整流程测试

**场景 1: 新用户进入**
```
1. 访问 http://localhost:3000/room/test-room?name=Alice
2. 观察：
   - 头像显示为 SVG
   - 用户 ID 为 user-{hash}
   - 模型选择为 DeepSeek（默认）
3. 发送消息
4. 观察：
   - 消息正确显示
   - 后端使用 DeepSeek 模型
```

**场景 2: 用户切换模型**
```
1. 点击 "Gemini" 按钮
2. 发送消息
3. 观察：
   - 后端使用 Gemini 模型
   - 模型选择保存到 localStorage
4. 刷新页面
5. 观察：
   - 模型选择仍为 "Gemini"
```

**场景 3: 笔记优化**
```
1. 修改笔记
2. 发送消息
3. 观察：
   - 请求体包含 notes
4. 再次发送消息（不修改笔记）
5. 观察：
   - 请求体不包含 notes
```

**场景 4: 多用户同步**
```
1. 打开两个浏览器窗口
2. 第一个窗口：输入用户名 "Alice"
3. 第二个窗口：输入用户名 "Bob"
4. 观察：
   - 两个用户的头像不同
   - 两个用户的 ID 不同
5. 第一个窗口发送消息
6. 观察：
   - 第二个窗口实时看到消息
```

---

## 📊 性能验证

### 网络传输

**测试方法**:
```
1. 打开浏览器开发者工具 → Network 标签
2. 过滤 goc-chat 请求
3. 发送多条消息
4. 观察请求大小
5. 比较修改前后的平均请求大小
```

**预期结果**:
- ✓ 请求大小减少 30-50%（笔记优化）
- ✓ 不必要的 notes 字段不再发送

### Liveblocks 同步

**测试方法**:
```
1. 打开两个浏览器窗口
2. 修改笔记
3. 观察两个窗口的同步延迟
4. 应该在 100ms 内同步
```

**预期结果**:
- ✓ 实时同步
- ✓ 无明显延迟

---

## 🐛 故障排查

### 问题 1: SVG 头像不显示

**症状**: 头像显示为空或加载失败

**排查步骤**:
```bash
# 1. 检查 Data URL 格式
localStorage.getItem('goc_ai_model')

# 2. 检查浏览器控制台是否有错误
# 3. 检查 SVG 字符串是否有效
```

**解决方案**:
- 检查 `generateSVGAvatar()` 函数是否正确
- 检查 `svgToDataUrl()` 是否正确编码

### 问题 2: 模型切换不生效

**症状**: 切换模型后仍使用旧模型

**排查步骤**:
```bash
# 1. 检查 localStorage 是否保存
localStorage.getItem('goc_ai_model')

# 2. 检查请求体中的 model 字段
# 在浏览器开发者工具中查看 Network → goc-chat

# 3. 检查后端是否正确处理 model 参数
```

**解决方案**:
- 清除 localStorage 并重试
- 检查后端 API 是否正确处理 model 参数

### 问题 3: 笔记优化不工作

**症状**: 每次都发送 notes，即使没有变化

**排查步骤**:
```bash
# 1. 检查 lastSentNotes 状态
# 在浏览器控制台中添加日志

# 2. 检查 hasNotesChanged 逻辑
# 验证笔记比较是否正确
```

**解决方案**:
- 检查 `lastSentNotes` 初始值
- 检查笔记比较逻辑

---

## ✅ 最终检查清单

- [ ] 所有文件已创建/修改
- [ ] 所有类型检查通过
- [ ] 笔记优化功能正常
- [ ] SVG 头像显示正确
- [ ] 模型切换功能正常
- [ ] localStorage 持久化正常
- [ ] 多用户同步正常
- [ ] 网络传输优化有效
- [ ] 没有控制台错误
- [ ] 没有性能问题

---

## 📝 测试报告模板

```markdown
# GOC 系统增强功能测试报告

## 测试日期
[日期]

## 测试环境
- 浏览器: [浏览器版本]
- Node 版本: [版本]
- 操作系统: [系统]

## 测试结果

### 笔记传输优化
- [ ] 通过
- [ ] 失败
- 备注: [备注]

### SVG 头像与固定 ID
- [ ] 通过
- [ ] 失败
- 备注: [备注]

### 多模型支持
- [ ] 通过
- [ ] 失败
- 备注: [备注]

### 用户工具函数
- [ ] 通过
- [ ] 失败
- 备注: [备注]

## 总体评分
[评分]

## 建议
[建议]
```

