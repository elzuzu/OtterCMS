import { contextBridge, ipcRenderer } from 'electron';
import type { Chan } from './shared/types';

contextBridge.exposeInMainWorld('api', {
  send: <C extends Chan>(c: C, d?: unknown) => ipcRenderer.send(c, d),
  on: <C extends Chan>(c: C, fn: (e: any, d: any) => void) => ipcRenderer.on(c, fn),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window')
});
