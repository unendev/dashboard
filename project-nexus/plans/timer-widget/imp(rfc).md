# Implementation Request for Comments (RFC) & Implementation Plan

**Title:** Migrate Nexus Widget to Standalone Timer App (Vite + Electron)
**Status:** DRAFT
**Target:** `timer/` (Frontend) & `project-nexus/` (Backend API)

## 1. Executive Summary

This document outlines the strategy to decouple the "Widget" functionality from the Next.js `project-nexus` monolith and re-implement it as a standalone React application using Vite within the `timer` Electron project. This move aims to resolve the "Dirty Hack" of static exports in Next.js, improve the development experience, and properly separate concerns between the desktop client (Timer) and the server (Nexus).

## 2. Problem Statement

- **Current State:** The "Widget" logic exists inside `project-nexus/app/widget`. To make it work with Electron, `next.config.ts` uses a conditional `output: 'export'` (controlled by `NEXT_CONFIG_WIDGET=true`). This forces a static build, breaking API routes and requiring a complex hybrid build process.
- **Issues:**
  - **"Dirty Hack":** Mixing static export logic with a dynamic full-stack app is fragile.
  - **Bloat:** The Electron app currently relies on building the *entire* Next.js frontend just to get a few widget pages.
  - **Maintenance:** Updates to the widget require rebuilding the massive Next.js project.

## 3. Goals

1.  **Rollback Nexus:** Remove the `output: 'export'` logic from `project-nexus/next.config.ts` and package scripts. Restore `nexus` to a pure dynamic Next.js application.
2.  **Standalone Timer App:** Initialize a Vite + React application inside `timer/` to serve as the UI for the Electron shell.
3.  **Migration:** Move `app/widget` components and logic (Timer, Todo, Memo, AI, Settings, Auth) to the new Vite app.
4.  **API Integration:** Refactor data fetching to communicate with the `project-nexus` API (running at `localhost:3000` or a deployed URL) instead of internal server actions/Next.js API routes.

---

## 4. Rollback Strategy (`project-nexus`)

### 4.1. `next.config.ts` Cleanup
- **Action:** Remove the `isWidgetBuild` logic.
- **Changes:**
  - Remove `output: isWidgetBuild ? 'export' : undefined`.
  - Remove `distDir: isWidgetBuild ? 'out-widget' : '.next'`.
  - Remove the conditional `images.unoptimized` block.
  - Remove the logic skipping ESLint/TypeScript during widget builds.
- **Result:** A standard Next.js configuration.

### 4.2. `package.json` Cleanup
- **Action:** Remove widget-specific scripts.
- **Remove:** `"build:widget": "cross-env NEXT_CONFIG_WIDGET=true npx next build && node scripts/copy-widget-assets.mjs"`
- **Note:** `scripts/copy-widget-assets.mjs` can likely be deleted.

---

## 5. Implementation Blueprint (`timer` Project)

### 5.1. Tech Stack
- **Bundler:** Vite
- **Framework:** React
- **Router:** React Router (since we need multiple "windows" or views: Timer, Todo, Memo, etc.)
- **Styling:** Tailwind CSS (matching Nexus design system)
- **State Management:** SWR / Zustand (continue using existing patterns)
- **Icons:** `lucide-react`

### 5.2. Directory Structure (`timer/`)
Currently `timer/` is just an Electron shell. We will initialize a Vite app in `timer/src` or root. Recommended structure:

```
timer/
├── electron/           # Main process code (main.js)
├── src/                # Vite React App (Renderer process)
│   ├── components/     # Migrated components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── shared/     # Shared logic
│   ├── pages/          # Views (Timer, Todo, Memo, Settings, Login, Create)
│   ├── lib/            # Utilities (auth, api, time formatting)
│   ├── App.tsx         # Main router
│   ├── main.tsx        # Entry point
│   └── index.css       # Tailwind directives
├── index.html          # Vite entry html
├── vite.config.ts
├── tailwind.config.js
└── package.json        # Unified dependencies
```

### 5.3. Migration & Code Audit

#### **A. Component Dependencies**
- **UI Library:** `shadcn/ui` (Radix Primitives). We need to copy `components/ui` from Nexus or reinstall them in the Vite app.
- **Styling:** Copy `globals.css` (or equivalent tailwind config) to ensure visual consistency.
- **Icons:** `lucide-react` is used extensively.

#### **B. Data Fetching & Auth**
- **Current:** `useSWR('/api/...')` with relative paths assuming same-origin.
- **New Strategy:**
  - **Base URL:** Define a `API_BASE_URL` (e.g., `http://localhost:3000` for dev).
  - **CORS:** Nexus API might need CORS configuration to allow requests from `localhost` (Electron usually has no origin or `file://`, but cleaner to handle this).
  - **Authentication:**
    - Current: NextAuth.js (session cookie).
    - New: The Electron app needs to share the session.
    - **Option 1 (Shared Cookie):** Electron's `session` partition is persistent. If the user logs in via the Widget (which hits the Nexus login endpoint), the cookie *should* be stored if `credentials: 'include'` is used.
    - **Refactor:** `fetcher` needs to be updated to prepend the API host.

#### **C. Specific Feature Migration**

1.  **Timer (`widget/timer/page.tsx`)**
    - **Logic:** `useTimerControl`, `useDoubleTap`. Move hooks to `src/hooks`.
    - **State:** Relies on `tasks` from `/api/timer-tasks`.
    - **Window Management:** Electron `ipcRenderer` calls (`openCreateWindow`, etc.). These need to be exposed via `contextBridge` in `preload.js` (if strictly secure) or just enable node integration (less secure, current state). *Current `timer/main.js` sets `nodeIntegration: false, contextIsolation: true`. We need a `preload.js` to expose IPC safely.*

2.  **Todo (`widget/todo/page.tsx`)**
    - **Logic:** LocalStorage for persistence (`widget-todo-items`). This is client-side only, so easy migration.
    - **Events:** Listens to `storage` events for sync across windows. This works fine in Electron views sharing the same LocalStorage.

3.  **Memo / Settings / AI**
    - Move pages to React Router routes (e.g., `/#/memo`, `/#/settings`).
    - **AI:** Calls `/api/chat/widget`. Needs API integration.

### 5.4. Electron Integration Updates
- **`timer/main.js`**:
  - Update `loadURL` to point to the Vite dev server (`http://localhost:5173`) in dev.
  - Update `loadFile` to point to `dist/index.html` in production.
  - **Window Routing:** Instead of loading different HTML files (`renderer/widget/timer.html`), we will load the *same* `index.html` but with a hash route (e.g., `index.html#/timer`, `index.html#/todo`).
  - **Refactor:** Simplify `createToolWindow` to accept a route path.

---

## 6. Implementation Steps

### Phase 1: Environment Setup
1.  **Initialize Vite:** Run `npm create vite@latest .` inside `timer/` (or merge manually).
2.  **Install Deps:** `react-router-dom`, `swr`, `lucide-react`, `tailwindcss`, `clsx`, `tailwind-merge`.
3.  **Setup Tailwind:** Copy config from Nexus.

### Phase 2: Code Migration
1.  **Copy Components:** Move `app/components/ui` -> `timer/src/components/ui`.
2.  **Copy Utils:** Move `lib/utils.ts` (cn helper).
3.  **Migrate Pages:**
    - `widget/timer/page.tsx` -> `src/pages/Timer.tsx`
    - `widget/todo/page.tsx` -> `src/pages/Todo.tsx`
    - ...others.
4.  **Setup Router:** Create `src/App.tsx` with routes for `/timer`, `/todo`, `/login`, etc.

### Phase 3: API & Logic Refactor
1.  **Auth/Fetch Wrapper:** Create a custom `fetch` wrapper that adds the API Base URL.
2.  **IPC Bridge:** Create `timer/preload.js` to expose:
    - `window.electron.openWindow('todo')`
    - `window.electron.resize(...)`
3.  **Update Main Process:** Update `main.js` to load the Vite app and handle the new routing scheme.

### Phase 4: Nexus Cleanup
1.  Delete `app/widget`.
2.  Clean `next.config.ts`.

---

## 7. Risks & Mitigation
- **CORS:** If Nexus API rejects requests from the Electron origin, we might need to proxy requests in the main process or adjust Nexus CORS headers.
- **Auth Persistence:** Ensuring `httpOnly` cookies work correctly in the Electron renderer.
- **Code Duplication:** UI components might diverge. *Mitigation:* In the future, extract shared UI to a workspace package. For now, duplication is acceptable for decoupling.
