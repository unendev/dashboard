# 代理配置指南

## 概述

本项目支持通过代理访问 Google Gemini API，用于在国内本地开发环境中使用。

### 自动行为

- **Vercel 部署**: ✅ 自动禁用代理（Vercel 服务器在国外，无需代理）
- **本地开发**: ⚠️ 自动启用代理（如果配置了 `HTTP_PROXY` 或 `HTTPS_PROXY`）

## 本地开发配置（国内）

### 1. 配置环境变量

在你的 `.env.local` 或 `.env` 文件中添加：

```bash
# 代理配置（二选一）
# 如果使用 V2Ray、ClashX 或其他代理工具，通常的 HTTP 代理端口是 10809
HTTP_PROXY=http://127.0.0.1:10809
HTTPS_PROXY=http://127.0.0.1:10809

# 或者 SOCKS5 代理（通常是 1080）
# HTTP_PROXY=socks5://127.0.0.1:1080
# HTTPS_PROXY=socks5://127.0.0.1:1080
```

### 2. 确保代理工具运行

```bash
# 例如，如果使用 V2Ray
v2rayN  # 启动代理工具

# 或 ClashX
open -a ClashX
```

### 3. 验证代理连接

```bash
# 测试 HTTP 代理
curl -x http://127.0.0.1:10809 https://www.google.com

# 测试 SOCKS5 代理
curl -x socks5://127.0.0.1:1080 https://www.google.com
```

## 支持的 API 客户端

- ✅ `@ai-sdk/google` (在 `app/api/goc-chat/route.ts`)
- ✅ `@google-cloud/vertexai` (在 `lib/gemini-vertex.ts`)

## 配置实现细节

### 文件修改

1. **app/api/goc-chat/route.ts**
   - 支持代理配置传入 `createGoogleGenerativeAI`
   - 本地开发环境自动启用代理

2. **lib/gemini-vertex.ts**
   - 支持代理配置传入 `VertexAI` 初始化
   - 本地开发环境自动启用代理

### 环境检测逻辑

```typescript
const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

if (!isProduction) {
  // 本地开发：启用代理
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:10809';
  // ... 配置代理
}
```

## 常见问题

### Q: 如何验证代理是否生效？

A: 检查服务器日志中 Google API 的连接状态：
```
✅ GET /api/goc-chat 200 - 成功连接
❌ Error [AI_RetryError]: Connect Timeout - 代理未生效
```

### Q: Vercel 部署时需要配置代理吗？

A: **不需要**。Vercel 的服务器已经在国外，可以直接访问 Google API。

### Q: 支持哪些代理类型？

A: 支持标准的：
- HTTP 代理（通常是 10809）
- SOCKS5 代理（通常是 1080）

### Q: 如何临时禁用代理？

A: 删除或注释 `.env.local` 中的代理配置：
```bash
# HTTP_PROXY=http://127.0.0.1:10809
# HTTPS_PROXY=http://127.0.0.1:10809
```

## 相关文件

- 环境变量定义: `lib/env.ts`
- Gemini 配置: `lib/gemini-vertex.ts`
- GOC Chat API: `app/api/goc-chat/route.ts`

## 测试代理配置

```bash
# 启动开发服务器
npm run dev

# 访问 GOC Chat 端点进行测试
# 应该能看到来自 Gemini API 的响应
```


