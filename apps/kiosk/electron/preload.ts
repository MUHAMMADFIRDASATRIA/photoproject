import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('photoboxDesktop', {
  platform: process.platform,
  isDesktop: true,
  getPrinters: () => ipcRenderer.invoke('photobox:get-printers'),
  printPhoto: (opts: unknown) => ipcRenderer.invoke('photobox:print-photo', opts),
  setDeviceToken: (token: string) => ipcRenderer.invoke('photobox:set-device-token', token),
  getDeviceToken: () => ipcRenderer.invoke('photobox:get-device-token'),
  clearDeviceToken: () => ipcRenderer.invoke('photobox:clear-device-token'),
});