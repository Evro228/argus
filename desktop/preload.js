const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('argusNative', {
  getIpcToken: () => {
    try {
      return ipcRenderer.sendSync('get-ipc-token');
    } catch (e) {
      console.error('[Preload] Failed to get IPC token:', e);
      return '';
    }
  },
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  }
});
