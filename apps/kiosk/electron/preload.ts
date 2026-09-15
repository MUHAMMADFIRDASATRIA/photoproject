import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('photoboxDesktop', {
  platform: process.platform,
  isDesktop: true,
  getPrinters: () => ipcRenderer.invoke('photobox:get-printers'),
  printPhoto: (opts: unknown) => ipcRenderer.invoke('photobox:print-photo', opts),
});