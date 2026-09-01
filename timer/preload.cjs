const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ['start-task', 'open-window', 'ai-create-task', 'open-create-window', 'open-memo-window', 'open-task-memo-window', 'open-todo-window', 'open-ai-window', 'open-settings-window', 'open-project-window', 'open-prompt-library-window', 'open-link-station-window', 'open-chart-window', 'show-toolbar-context-menu', 'show-mode-menu', 'save-links-data', 'backup-and-push', 'open-external-link', 'window-mouse-enter', 'window-mouse-leave', 'save-unified-storage'];
    if (validChannels.includes(channel)) {
      console.log(`[Preload] Sending IPC: ${channel}`);
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`[Preload] Blocked unauthorized IPC: ${channel}`);
    }
  },
  invoke: (channel, data) => {
    let validChannels = ['get-links-data', 'get-agent-skills', 'get-unified-storage', 'create-manual-backup'];
    if (validChannels.includes(channel)) {
      console.log(`[Preload] Invoking IPC: ${channel}`);
      return ipcRenderer.invoke(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['on-start-task', 'on-console-log', 'on-mode-selected'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  }
});
