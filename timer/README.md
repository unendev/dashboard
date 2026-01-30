# Timer Widget (计时器组件)

一个基于 Electron 和 React 的轻量级桌面计时器小部件，专为 Project Nexus 设计，支持专注计时与任务管理。

## 🌟 特性

- **桌面小部件**：总是置顶（可选）的浮动窗口，方便随时查看和控制。
- **专注模式**：极简界面，减少干扰。
- **任务同步**：与 Project Nexus 主平台无缝同步任务和标签。
- **快捷操作**：支持全局快捷键（待开发）和托盘控制。

## 🛠️ 技术栈

- **核心**：Electron
- **UI**：React 19, Tailwind CSS 4
- **构建工具**：Vite, electron-builder
- **数据**：SWR (状态管理), unendev-shared (共享逻辑)

## 📦 安装与运行

### 开发模式

```bash
# 在根目录安装所有依赖
pnpm install

# 进入 timer 目录
cd timer

# 启动开发服务器和 Electron 窗口
pnpm start
```

### 构建发布

```bash
# 构建 Windows 便携版 (.exe)
pnpm build

# 快速构建 (仅 UI 和解包目录)
pnpm build:fast
```

构建产物将位于 `timer/release` 目录。

## 🔧 配置

主要配置位于 `package.json` 的 `build` 字段和 `electron-builder` 配置中。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 改进体验！
