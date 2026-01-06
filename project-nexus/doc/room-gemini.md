## /room 里的 Gemini：当前实现与验证方式

### 1) 当前是否走 Vertex？

**不是。** `/room` 这条链路当前走的是 `@ai-sdk/google`（Google Generative AI API Key 方式），并通过后端路由 `/api/goc-chat` 进行流式对话。

关键证据：

- **前端**：`app/components/goc/GOCCommandCenter.tsx`
  - 使用 `DefaultChatTransport({ api: '/api/goc-chat', body: { model: aiModel, ... } })`
  - UI 上可切换 `aiModel: 'deepseek' | 'gemini'`
- **后端**：`app/api/goc-chat/route.ts`
  - `createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY })`
  - 当 `model === 'gemini'` 时选择 `google('gemini-2.0-flash-exp')`

### 2) Vertex 相关代码是什么状态？

仓库里存在 `lib/gemini-vertex.ts`（`@google-cloud/vertexai` 封装），但 **当前未被 /room 或 /api/goc-chat 引用**。

它更像是“未来迁移/实验预案”，目前保留不会影响运行；但请避免误认为已经接入。

### 3) 真实可用性怎么验证（smoke test）

本项目 `npm run dev` 会自动从 **10000** 开始找空闲端口启动（`scripts/start-dev.mjs`），因此端口可能是 `10000-10009` 之一。

验证思路：

- 启动 dev server（后台保持运行）
- 对 `http://localhost:<port>/api/goc-chat` 发一个最小 POST，请求体里显式设置 `"model": "gemini"`
- 期待：HTTP 200，并返回 Vercel AI SDK 的流式响应（不是普通 JSON）。终端里也会看到 `/api/goc-chat` 的日志输出（`Text chunk` / `Stream finished` 等）。

> 注意：这类真实验证依赖本地环境变量（例如 `GOOGLE_API_KEY`、以及应用启动所需的 `NEXTAUTH_*`/数据库 URL 等）。如果缺失，测试会以 500/启动失败的形式暴露出来。



