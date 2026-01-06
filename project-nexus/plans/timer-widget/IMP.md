# Implementation Plan: Desktop Timer Widget

## 1. Project Structure
Create a dedicated folder for the Electron shell parallel to the Next.js app.

```
root/
├── project-nexus/         # Existing Next.js App
│   └── app/
│       └── features/
│           └── timer/
│               └── widget/
│                   ├── page.tsx      # The Widget UI
│                   └── layout.tsx    # Minimal layout (no navbar)
└── timer-widget-electron/ # New Electron Shell
    ├── package.json
    ├── main.js
    └── icon.ico           # Application Icon
```

## 2. Phase 1: Next.js Widget Page Implementation

### 2.1 File: `app/features/timer/widget/layout.tsx`
- **Goal**: Provide a clean context without the global application layout (navbar, sidebar).
- **Style**: Set `html` and `body` to transparent.

### 2.2 File: `app/features/timer/widget/page.tsx`
- **Component**: `TimerWidget`
- **Logic**:
    - Reuse `useTimerControl` hook for timer logic.
    - Fetch tasks using existing `taskService` or `SWR`/`React Query`.
    - **Filter**: Only show `RUNNING` task as primary. If no running task, show "No Active Task" or the last paused task.
    - **List**: Fetch top 5 recent tasks for the hover menu.
- **Styling (Tailwind)**:
    - `w-screen h-screen` (relative to the small electron window).
    - `bg-zinc-900/90` (dark semi-transparent).
    - `draggable` region logic:
        - Container: `-webkit-app-region: drag`
        - Buttons: `-webkit-app-region: no-drag`

## 3. Phase 2: Electron Shell Implementation

### 3.1 Setup
```bash
mkdir timer-widget-electron
cd timer-widget-electron
npm init -y
npm install electron --save-dev
```

### 3.2 File: `timer-widget-electron/main.js`
- **Config**:
    - `width: 300`, `height: 150`
    - `frame: false` (Frameless)
    - `transparent: true`
    - `alwaysOnTop: true`
    - `webPreferences: { nodeIntegration: false }`
- **Behavior**:
    - Load `http://localhost:3000/features/timer/widget` (Dev) or Production URL.
    - Handle `window-all-closed` event.

### 3.3 Scripts (`timer-widget-electron/package.json`)
- `"start": "electron ."`

## 4. Phase 3: Authentication Bridge (Simplest Approach)
- Since the Electron app loads the actual Next.js URL, it behaves like a standard browser.
- **First Run**:
    1. User opens Widget.
    2. Next.js middleware redirects to `/auth/signin` if no session.
    3. User logs in *inside the small widget window*.
    4. **Optimization**: Detect `/auth/signin` URL in Electron `main.js` and temporarily resize window to `800x600` for easy login, then resize back to `300x150` after successful redirect to `/features/timer/widget`.

## 5. Execution Checklist

- [ ] **Next.js**: Create `layout.tsx` for widget (transparent background).
- [ ] **Next.js**: Create `page.tsx` with `TimerWidget` component.
- [ ] **Next.js**: Style UI for 300x150 dimensions.
- [ ] **Electron**: Initialize project.
- [ ] **Electron**: Implement `main.js` with window resizing logic for login.
- [ ] **Test**: Run both and verify interaction.
