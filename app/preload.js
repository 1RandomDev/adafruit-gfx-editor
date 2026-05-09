const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
    getSettings: () => ipcRenderer.invoke('getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('saveSettings', settings),
    sendDisplayCommands: cmds => ipcRenderer.invoke('sendDisplayCommands', cmds)
});
