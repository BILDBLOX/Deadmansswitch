'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (partial) => ipcRenderer.invoke('config:save', partial),
  listProcesses: () => ipcRenderer.invoke('processes:list'),
  arm: (hotkey) => ipcRenderer.invoke('switch:arm', hotkey),
  disarm: () => ipcRenderer.invoke('switch:disarm'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  onTriggered: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('switch:triggered', listener);
    return () => ipcRenderer.removeListener('switch:triggered', listener);
  }
});
