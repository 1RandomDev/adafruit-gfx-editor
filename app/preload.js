const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
    sendDisplayCommands: cmds => ipcRenderer.invoke('sendDisplayCommands', cmds)
});
