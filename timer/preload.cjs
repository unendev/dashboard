const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ['start-task', 'open-window', 'ai-create-task', 'open-create-window', 'open-memo-window', 'open-task-memo-window', 'open-todo-window', 'open-ai-window', 'open-settings-window', 'open-project-window', 'open-prompt-library-window'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['on-start-task', 'on-console-log'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  }
});
