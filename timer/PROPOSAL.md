# Project Nexus 商业化重构提案：迈向 "Obsidian 模式"

## 1. 现状深度分析

### 1.1 现有架构特征
目前 `timer` 模块（桌面端）是一个典型的 **"瘦客户端 (Thin Client)"**，具有以下特征：
*   **强后端耦合**: 核心业务逻辑（任务的创建、开始、暂停、停止）完全依赖远程 API (`/api/timer-tasks`)。
    *   证据：`useTimerControl.ts` 中直接调用 `fetchWithRetry` 操作远程数据。
    *   证据：`main.js` 中 `ai-create-task` 通过 IPC 代理转发请求到后端。
*   **云端数据主权**: 数据存储在远程 PostgreSQL 数据库中，本地仅有少量的 UI 状态缓存（`localStorage` 存储窗口位置、创建模式等）。
*   **在线优先**: 断网状态下，核心计时功能将瘫痪或极其不可靠。

### 1.2 现有痛点 (针对商业化目标)
1.  **用户信任成本高**: 个人时间记录属于极度隐私的数据。云端存储模式要求用户完全信任开发者。
2.  **服务运维成本**: 随着用户量增加，数据库和服务器带宽成本将线性增长，对于 "5元/月" 的低定价策略，边际成本可能过高。
3.  **体验受限**: 依赖网络状况，无法实现极致的“零延迟”交互（尽管前端做了乐观更新，但本质仍需等待服务器确认）。
4.  **扩展性瓶颈**: 功能硬编码在 React 组件中，第三方开发者无法通过插件扩展功能。

---

## 2. 新架构愿景：Nexus Local (本地优先)

我们建议重构为 **"Local-first (本地优先)"** 架构，参考 Obsidian/Logseq 的模式。

### 2.1 核心原则
1.  **数据在本地**: 用户拥有数据的完全掌控权。数据以 **纯文本 (Markdown/JSON)** 形式存储在用户硬盘上。
2.  **离线可用**: 软件在无网络环境下功能 100% 完整。
3.  **逻辑下沉**: 原本在服务器运行的业务逻辑（时间计算、统计分析、AI 解析）下沉到客户端（Electron 主进程或 Shared Worker）。
4.  **云端可选**: 服务器不再是“大脑”，而是“同步中继站”。

### 2.2 数据存储设计 (The "Vault")

建议采用 **"双层存储架构"**：
*   **源文件层 (Truth)**: 用户可读的 Markdown 文件。
*   **索引层 (Cache)**: 高性能的本地数据库，用于快速查询和统计。

#### 文件目录结构示例
```text
MyTimeVault/
├── 2026/
│   ├── 01/
│   │   ├── 2026-01-26.md  <-- 每日日志 (柳比歇夫核心)
│   │   └── ...
├── Projects/
│   ├── ProjectNexus.md    <-- 项目元数据
│   └── ...
├── .nexus/
│   ├── index.db           <-- SQLite/PGLite 索引
│   └── plugins/           <-- 插件目录
└── nexus.config.json
```

#### Markdown 文件格式规范 (每日日志)
利用 Frontmatter 存储元数据，正文记录时间流。

```markdown
---
date: 2026-01-26
total_focus: 6h 30m
tags: [work, deep-dive]
---

## 08:00 - 09:30
- **Project**: [[ProjectNexus]]
- **Task**: 架构设计与文档撰写
- **Tags**: #architecture #documentation
- **Status**: Completed

## 09:30 - 10:00
- **Activity**: 休息/咖啡
- **Tags**: #rest
```

### 2.3 插件化架构
将核心功能模块化，开放 API 给社区。

*   **Core Plugins (内置插件)**: 计时器、Todo、统计图表、AI 助手。
*   **Community Plugins (社区插件)**: 番茄钟、Habit Tracker、第三方日历同步。

**插件接口示例 (TypeScript)**:
```typescript
interface NexusPlugin {
  onload(): void;
  onunload(): void;
  // 注册新的视图
  registerView(viewType: string, view: ViewCreator): void;
  // 监听计时事件
  on(event: 'timer-start', callback: (task: Task) => void): void;
}
```

---

## 3. 技术栈推荐

### 3.1 核心技术栈
| 模块 | 推荐方案 | 理由 |
| :--- | :--- | :--- |
| **App Shell** | **Electron** | 保持现状。成熟，系统级能力强（托盘、快捷键、文件系统）。 |
| **Frontend** | **React + Vite** | 保持现状。生态丰富，组件复用度高。 |
| **Local DB** | **PGLite (Postgres inside WASM)** | **强烈推荐**。用户现有后端即 Postgres+Prisma。使用 PGLite 可以**直接复用现有的 Prisma Schema 和大部分后端业务代码**，将其运行在浏览器/Electron 环境中，零成本迁移。 |
| **File Watcher** | **Chokidar** | 监听文件变化，实时更新数据库索引。 |
| **State Sync** | **RxDB / Yjs** | 如果需要极其复杂的实时协作，选 Yjs。如果是简单的多端同步，基于文件的同步即可。 |

### 3.2 关于后端与云服务
**观点：后端依然需要，但角色转变。**

*   **旧角色**: 逻辑中心、数据中心。
*   **新角色**:
    1.  **同步服务 (Sync Server)**: 提供端到端加密的数据同步 (类似 Obsidian Sync)。这是**核心盈利点** (5元/月)。
    2.  **AI 中转**: 如果用户不使用本地 LLM，可通过后端转发 AI 请求（需消耗 Token，可作为增值服务）。
    3.  **鉴权与订阅**: 管理用户账户和付费状态。

---

## 4. 迁移路线图

### 阶段一：混合模式 (Hybrid Mode) - 快速验证
*   **目标**: 不完全重写，先引入本地存储作为“备份”和“离线缓存”。
*   **行动**:
    1.  修改 `main.js`，引入 `better-sqlite3` 或 `lowdb`。
    2.  在 API 请求失败时，降级使用本地存储。
    3.  实现简单的 "Export to Markdown" 功能，让用户尝到甜头。

### 阶段二：本地优先 (Local First) - 架构重构
*   **目标**: 移除对远程 API 的强依赖。
*   **行动**:
    1.  引入 **PGLite**。将 Prisma Client 的连接指向本地 WASM Postgres。
    2.  重构 `useTimerControl`，使其调用本地 Service 层，而非直接 Fetch API。
    3.  实现文件系统监听器，双向绑定 Markdown 文件与 DB。

### 阶段三：生态构建
*   **目标**: 插件系统与商业化。
*   **行动**:
    1.  提取核心逻辑为 SDK。
    2.  构建插件市场 UI。
    3.  上线端到端加密同步服务。

## 5. 待决策关键点

1.  **数据库选型**:
    *   **PGLite**: 复用代码最容易，但 WASM 体积稍大。
    *   **SQLite**: 性能极致，原生支持好，但需重写 Prisma Schema 和查询逻辑。
    *   **建议**: 鉴于只有我在开发，**PGLite** 能极大减少重构工作量。

2.  **同步策略**:
    *   **方案 A (极简)**: 不做同步服务，让用户用 iCloud/OneDrive/Git。盈利点仅在于“高级功能授权”。
    *   **方案 B (Obsidian)**: 提供官方同步服务。盈利点清晰，但开发难度大（需处理冲突）。
    *   **建议**: 初期采用 **方案 A**，专注于核心体验；中后期引入 **方案 B**。

3.  **移动端**:
    *   Obsidian 模式要求移动端也能读写本地文件。
    *   这将涉及到 React Native + 文件系统访问，比 Web App 复杂。

---
**结论**: 建议立即着手 **阶段一**，在 `main.js` 中引入本地文件写入能力，实现“数据即时落盘为 Markdown”，作为现有云端功能的补充，不仅增加了安全性，也为未来的架构迁移打下基础。
