const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petModes', {
  getCalendar: (source) => ipcRenderer.invoke('pet-calendar', source),
  drag(offsetX, offsetY) {
    ipcRenderer.send('pet-drag', offsetX, offsetY);
  },
  onChange(callback) {
    ipcRenderer.on('pet-mode', (_event, mode) => callback(mode));
  }
});
