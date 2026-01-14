# task: restore-timer-electron-windows

## scope
- Restore Timer Electron multi-window behavior for memo/todo/ai/project/prompt/create/task-memo via IPC
- Ensure external links still open in browser
- Avoid changes to unrelated components

## plan
1) Inspect current Timer window open calls and preload whitelist for required channels.
   - Files: timer/src/pages/Timer.tsx, timer/preload.cjs
2) Restore main-process window management based on last known working version.
   - Files: timer/main.js
   - Reintroduce createToolWindow, per-window toggles, project window map, task memo window map, loadWindow helper.
   - Keep tray/main window logic intact; add IPC handlers for open-*-window.
   - Ensure setWindowOpenHandler only opens external links.
3) Update renderer buttons to use IPC for memo/todo/ai where needed, with web fallback if electron absent.
   - Files: timer/src/pages/Timer.tsx
4) Quick sanity check: ensure no other components touched; verify IPC channel list matches handlers.

## notes
- Do not modify unrelated UI or project-nexus components.
- Keep window sizes/behavior consistent with historical implementation unless conflicts arise.
