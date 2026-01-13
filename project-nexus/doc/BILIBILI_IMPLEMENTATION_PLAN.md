# Bilibili 个人信息源实现计划

## 项目概述

在 Project Nexus 中集成 Bilibili 个人信息源，允许用户统一管理和查看来自 Bilibili 的内容（视频、动态、收藏等）。

## 已完成的工作

### 1. API 文档 (`BILIBILI_API_GUIDE.md`)
- ✅ 14 个核心 API 接口详细说明
- ✅ 请求参数和响应结构
- ✅ 错误码和数据类型说明
- ✅ 实现建议和最佳实践

### 2. 服务层 (`lib/bilibili-service.ts`)
- ✅ 通用 API 请求函数
- ✅ 12 个业务函数封装
- ✅ 错误处理和日志记录
- ✅ 数据解析工具函数

### 3. 数据库模型 (`BILIBILI_SCHEMA.md`)
- ✅ 9 个 Prisma 模型定义
- ✅ 完整的数据关系设计
- ✅ 查询示例和性能优化建议
- ✅ 数据清理策略

### 4. API 路由示例 (`app/api/bilibili/user-info/route.ts`)
- ✅ 用户信息获取端点
- ✅ 认证验证
- ✅ 错误处理

## 后续实现步骤

### Phase 1: 数据库和基础设施 (优先级: 高)

#### 1.1 添加数据库模型
```bash
# 1. 编辑 prisma/schema.prisma，添加 Bilibili 相关模型
# 2. 创建迁移
npm run db:migrate:create -- --name add_bilibili_models

# 3. 应用迁移
npm run db:push

# 4. 生成 Prisma 客户端
npm run prisma:generate
```

#### 1.2 创建认证管理
- [ ] 创建 `lib/bilibili-auth.ts` - 处理 Cookie 存储和更新
- [ ] 创建 `app/api/bilibili/auth/login/route.ts` - 登录端点
- [ ] 创建 `app/api/bilibili/auth/logout/route.ts` - 登出端点
- [ ] 实现 Cookie 过期检测和自动刷新

#### 1.3 创建缓存层
- [ ] 创建 `lib/bilibili-cache.ts` - Redis 缓存管理
- [ ] 实现缓存策略（TTL、更新机制）
- [ ] 添加缓存预热功能

### Phase 2: 核心 API 端点 (优先级: 高)

#### 2.1 用户相关端点
- [ ] `GET /api/bilibili/user-info` - 获取用户信息 ✅ (已创建框架)
- [ ] `GET /api/bilibili/user-dynamics` - 获取用户动态
- [ ] `GET /api/bilibili/user-followings` - 获取关注列表
- [ ] `GET /api/bilibili/user-followers` - 获取粉丝列表

#### 2.2 视频相关端点
- [ ] `GET /api/bilibili/videos` - 获取用户视频列表
- [ ] `GET /api/bilibili/videos/[id]` - 获取视频详情
- [ ] `GET /api/bilibili/videos/recommended` - 获取推荐视频

#### 2.3 收藏相关端点
- [ ] `GET /api/bilibili/collections` - 获取收藏夹列表
- [ ] `GET /api/bilibili/collections/[id]` - 获取收藏夹内容
- [ ] `POST /api/bilibili/collections/sync` - 同步收藏数据

#### 2.4 动态相关端点
- [ ] `GET /api/bilibili/dynamics` - 获取动态列表
- [ ] `GET /api/bilibili/dynamics/[id]` - 获取动态详情
- [ ] `POST /api/bilibili/dynamics/sync` - 同步动态数据

### Phase 3: 前端组件 (优先级: 中)

#### 3.1 信息源展示组件
- [ ] `app/components/features/bilibili/BilibiliFeed.tsx` - 信息源主组件
- [ ] `app/components/features/bilibili/VideoCard.tsx` - 视频卡片
- [ ] `app/components/features/bilibili/DynamicCard.tsx` - 动态卡片
- [ ] `app/components/features/bilibili/CollectionCard.tsx` - 收藏卡片

#### 3.2 用户信息组件
- [ ] `app/components/features/bilibili/UserProfile.tsx` - 用户资料
- [ ] `app/components/features/bilibili/UserStats.tsx` - 用户统计
- [ ] `app/components/features/bilibili/FollowingList.tsx` - 关注列表

#### 3.3 页面
- [ ] `app/bilibili/page.tsx` - Bilibili 信息源主页
- [ ] `app/bilibili/videos/page.tsx` - 视频列表页
- [ ] `app/bilibili/collections/page.tsx` - 收藏夹页
- [ ] `app/bilibili/dynamics/page.tsx` - 动态页

### Phase 4: 数据同步和更新 (优先级: 中)

#### 4.1 后台同步任务
- [ ] 创建 `scripts/sync-bilibili-data.mjs` - 数据同步脚本
- [ ] 实现增量更新机制
- [ ] 添加到 cron 任务

#### 4.2 实时更新
- [ ] 实现 WebSocket 连接（可选）
- [ ] 添加手动刷新功能
- [ ] 实现自动刷新间隔

#### 4.3 错误恢复
- [ ] 实现重试机制（指数退避）
- [ ] 添加失败通知
- [ ] 记录详细日志

### Phase 5: 高级功能 (优先级: 低)

#### 5.1 数据分析
- [ ] 视频观看统计
- [ ] 动态互动分析
- [ ] 收藏内容分类统计

#### 5.2 个性化推荐
- [ ] 基于观看历史的推荐
- [ ] 基于收藏内容的推荐
- [ ] 热门内容推荐

#### 5.3 内容管理
- [ ] 收藏导入/导出
- [ ] 动态备份
- [ ] 内容搜索和过滤

## 技术栈

### 后端
- **框架**: Next.js 15 (App Router)
- **数据库**: PostgreSQL + Prisma 6.x
- **缓存**: Redis (可选)
- **认证**: NextAuth.js 4.x

### 前端
- **框架**: React 19
- **样式**: Tailwind CSS 3.x
- **组件**: shadcn/ui
- **状态管理**: Zustand + React Query

### 工具
- **HTTP 客户端**: Fetch API
- **类型检查**: TypeScript 5.x
- **代码质量**: ESLint

## 环境变量配置

在 `.env.local` 中添加：

```env
# Bilibili 配置
BILIBILI_COOKIE_ENCRYPTION_KEY=your_encryption_key_here
BILIBILI_API_TIMEOUT=10000
BILIBILI_CACHE_TTL=3600

# Redis 配置（可选）
REDIS_URL=redis://localhost:6379

# 同步配置
BILIBILI_SYNC_INTERVAL=3600
BILIBILI_SYNC_ENABLED=true
```

## 安全考虑

1. **Cookie 管理**
   - 使用加密存储 SESSDATA
   - 定期验证 Cookie 有效性
   - 实现 Cookie 过期提醒

2. **速率限制**
   - 实现请求队列
   - 添加速率限制中间件
   - 处理 429 响应

3. **数据隐私**
   - 仅存储用户授权的数据
   - 实现数据删除功能
   - 遵守 Bilibili 服务条款

4. **错误处理**
   - 不在错误消息中暴露敏感信息
   - 记录详细的内部日志
   - 实现优雅降级

## 测试计划

### 单元测试
- [ ] `lib/bilibili-service.ts` 测试
- [ ] 数据解析函数测试
- [ ] 缓存逻辑测试

### 集成测试
- [ ] API 端点测试
- [ ] 数据库操作测试
- [ ] 认证流程测试

### E2E 测试
- [ ] 用户登录流程
- [ ] 数据同步流程
- [ ] 信息源展示流程

## 部署检查清单

- [ ] 环境变量配置完整
- [ ] 数据库迁移已应用
- [ ] 缓存服务已启动
- [ ] API 端点已测试
- [ ] 前端组件已集成
- [ ] 错误日志已配置
- [ ] 监控告警已设置

## 性能目标

- API 响应时间 < 500ms
- 页面加载时间 < 2s
- 缓存命中率 > 80%
- 数据同步成功率 > 99%

## 参考资源

- [Bilibili API 文档](./BILIBILI_API_GUIDE.md)
- [数据库模型设计](./BILIBILI_SCHEMA.md)
- [Bilibili API 收集项目](https://github.com/socialsisteryi/bilibili-api-collect)
- [Project Nexus 架构](./ARCHITECTURE.md)

## 联系和支持

如有问题或建议，请提交 Issue 或 PR。

---

**最后更新**: 2026-01-10
**状态**: 规划中
**优先级**: 高
