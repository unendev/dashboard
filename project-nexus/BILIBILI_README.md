# Bilibili 个人信息源集成

欢迎使用 Project Nexus 的 Bilibili 个人信息源功能！本文档将帮助你快速了解和使用相关功能。

## 📖 文档导航

### 🚀 快速开始
- **[快速参考指南](./doc/BILIBILI_QUICK_REFERENCE.md)** - 最常用的 API 和代码示例
  - 快速开始示例
  - API 端点速查表
  - 常见问题解答

### 📚 详细文档
- **[完整 API 指南](./doc/BILIBILI_API_GUIDE.md)** - 所有 API 接口的详细说明
  - 14 个核心 API 接口
  - 请求参数和响应结构
  - 数据类型和错误码
  - 实现建议

- **[数据库模型设计](./doc/BILIBILI_SCHEMA.md)** - Prisma 数据库模型
  - 9 个核心模型定义
  - 数据关系图
  - 查询示例
  - 性能优化建议

- **[实现计划](./doc/BILIBILI_IMPLEMENTATION_PLAN.md)** - 分阶段实现指南
  - 5 个实现阶段
  - 具体任务清单
  - 技术栈说明
  - 测试和部署计划

### 📋 总结文档
- **[集成总结](./doc/BILIBILI_INTEGRATION_SUMMARY.md)** - 项目概览和文件清单
  - 已创建的文件列表
  - 核心特性说明
  - 快速开始步骤
  - 技术栈信息

## 🎯 按用途选择文档

### 我想快速了解如何使用
→ 查看 **[快速参考指南](./doc/BILIBILI_QUICK_REFERENCE.md)**

### 我想了解所有可用的 API
→ 查看 **[完整 API 指南](./doc/BILIBILI_API_GUIDE.md)**

### 我想设计数据库模型
→ 查看 **[数据库模型设计](./doc/BILIBILI_SCHEMA.md)**

### 我想了解实现计划
→ 查看 **[实现计划](./doc/BILIBILI_IMPLEMENTATION_PLAN.md)**

### 我想了解项目概览
→ 查看 **[集成总结](./doc/BILIBILI_INTEGRATION_SUMMARY.md)**

## 💻 代码文件

### 服务层
- **`lib/bilibili-service.ts`** - Bilibili API 的 TypeScript 封装
  - 通用 API 请求函数
  - 12 个业务函数
  - 数据解析工具

### API 路由
- **`app/api/bilibili/user-info/route.ts`** - 获取用户信息的 API 端点示例
  - 可作为其他端点的模板

## 🚀 快速开始

### 1. 查看快速参考
```bash
cat doc/BILIBILI_QUICK_REFERENCE.md
```

### 2. 获取用户信息
```typescript
import { getUserInfo } from '@/lib/bilibili-service';

const userInfo = await getUserInfo(123456); // mid
console.log(userInfo.name, userInfo.level);
```

### 3. 获取用户动态
```typescript
import { getUserDynamics } from '@/lib/bilibili-service';

const dynamics = await getUserDynamics(123456, '0', 30);
```

### 4. 获取收藏夹
```typescript
import { getUserFavorites } from '@/lib/bilibili-service';

const favorites = await getUserFavorites(123456);
```

## 📊 API 概览

| 功能 | 函数 | 认证 |
|------|------|------|
| 获取视频详情 | `getVideoDetail()` | 可选 |
| 获取视频统计 | `getVideoStat()` | 否 |
| 获取推荐视频 | `getRecommendedVideos()` | 可选 |
| 获取用户信息 | `getUserInfo()` | 否 |
| 获取用户动态 | `getUserDynamics()` | 是 |
| 获取收藏夹 | `getUserFavorites()` | 是 |
| 获取收藏内容 | `getFavoriteContent()` | 是 |
| 获取关注列表 | `getUserFollowings()` | 是 |
| 获取粉丝列表 | `getUserFollowers()` | 是 |
| 获取动态草稿 | `getUserDynamicDrafts()` | 是 |
| 获取消息设置 | `getUserMessageSettings()` | 是 |
| 获取私信媒体 | `getPrivateMessageMediaInfo()` | 是 |
| 获取播放器信息 | `getVideoPlayer()` | 可选 |
| 批量获取收藏详情 | `getFavoriteResourceInfos()` | 否 |

## 🔐 认证

### 获取 Cookie
1. 打开 https://www.bilibili.com
2. 登录账号
3. 打开浏览器开发者工具 (F12)
4. 进入 Application → Cookies
5. 复制 `SESSDATA` 值

### 使用认证
```typescript
const auth = {
  sessdata: 'your_sessdata_here',
  csrf_token: 'your_csrf_token_here',
  csrf: 'your_csrf_here'
};

const dynamics = await getUserDynamics(123456, '0', 30, auth);
```

## 📈 实现阶段

### Phase 1: 基础设施 (优先级: 高)
- 添加数据库模型
- 创建认证管理
- 创建缓存层

### Phase 2: API 端点 (优先级: 高)
- 用户相关端点
- 视频相关端点
- 收藏相关端点
- 动态相关端点

### Phase 3: 前端组件 (优先级: 中)
- 信息源展示组件
- 用户信息组件
- 页面集成

### Phase 4: 数据同步 (优先级: 中)
- 后台同步任务
- 实时更新
- 错误恢复

### Phase 5: 高级功能 (优先级: 低)
- 数据分析
- 个性化推荐
- 内容管理

详见 [实现计划](./doc/BILIBILI_IMPLEMENTATION_PLAN.md)

## 🛠️ 技术栈

- **后端框架**: Next.js 15 (App Router)
- **数据库**: PostgreSQL + Prisma 6.x
- **认证**: NextAuth.js 4.x
- **语言**: TypeScript 5.x
- **HTTP 客户端**: Fetch API
- **缓存**: Redis (可选)

## 📚 相关资源

- [Bilibili API 收集项目](https://github.com/socialsisteryi/bilibili-api-collect)
- [Bilibili API Python 库](https://github.com/nemo2011/bilibili-api)
- [Project Nexus 架构](./doc/ARCHITECTURE.md)
- [Next.js 官方文档](https://nextjs.org/docs)
- [Prisma 官方文档](https://www.prisma.io/docs)

## ❓ 常见问题

### Q: 如何获取用户的 mid？
A: 访问用户主页，URL 中的数字就是 mid。例如：`https://space.bilibili.com/123456` 中的 `123456` 就是 mid。

### Q: Cookie 过期了怎么办？
A: 重新登录 Bilibili 获取新的 SESSDATA，更新存储的认证凭证。

### Q: 如何避免速率限制？
A: 实现请求队列、添加延迟、使用缓存减少请求数。详见 [快速参考指南](./doc/BILIBILI_QUICK_REFERENCE.md)。

### Q: 支持哪些数据类型？
A: 视频、音频、番剧、动态、收藏等。详见 [完整 API 指南](./doc/BILIBILI_API_GUIDE.md)。

### Q: 如何处理错误？
A: 查看 [快速参考指南](./doc/BILIBILI_QUICK_REFERENCE.md) 中的错误处理部分。

## 🤝 贡献

如需扩展功能：

1. 查看 [完整 API 指南](./doc/BILIBILI_API_GUIDE.md) 了解可用的 API
2. 在 `lib/bilibili-service.ts` 中添加新函数
3. 创建对应的 API 路由
4. 添加数据库模型（如需要）
5. 更新文档

## ⚠️ 注意事项

1. **遵守服务条款** - 仅获取用户授权的数据
2. **保护隐私** - 不要在代码中硬编码 Cookie
3. **实现缓存** - 减少 API 请求，避免速率限制
4. **错误处理** - 实现完善的错误处理和重试机制
5. **数据安全** - 使用加密存储敏感信息

## 📞 获取帮助

- 查看相关文档
- 检查快速参考指南
- 参考示例代码
- 查看常见问题

## 📝 文件清单

```
project-nexus/
├── BILIBILI_README.md                          # 本文件
├── doc/
│   ├── BILIBILI_API_GUIDE.md                   # 完整 API 文档
│   ├── BILIBILI_SCHEMA.md                      # 数据库模型
│   ├── BILIBILI_IMPLEMENTATION_PLAN.md         # 实现计划
│   ├── BILIBILI_QUICK_REFERENCE.md             # 快速参考
│   └── BILIBILI_INTEGRATION_SUMMARY.md         # 集成总结
├── lib/
│   └── bilibili-service.ts                     # 服务层
└── app/api/bilibili/
    └── user-info/route.ts                      # API 路由示例
```

## 🎉 开始使用

1. **新手?** → 查看 [快速参考指南](./doc/BILIBILI_QUICK_REFERENCE.md)
2. **需要详情?** → 查看 [完整 API 指南](./doc/BILIBILI_API_GUIDE.md)
3. **要实现功能?** → 查看 [实现计划](./doc/BILIBILI_IMPLEMENTATION_PLAN.md)
4. **要设计数据库?** → 查看 [数据库模型设计](./doc/BILIBILI_SCHEMA.md)

---

**版本**: 1.0  
**创建日期**: 2026-01-10  
**状态**: 完成  
**下一步**: 按照实现计划开始开发

祝你使用愉快！🚀
