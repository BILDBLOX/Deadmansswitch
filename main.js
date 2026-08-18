'use strict';

const path = require('path');
const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const { loadConfig, saveConfig } = require('./src/config');
const { listRunningProcesses } = require('./src/processes');
const { performAction } = require('./src/actions');

let mainWindow = null;
let keepAliveWindow = null; // set when a decoy/dummy window should survive app quit
let armState = 'idle'; // 'idle' | 'armed' | 'triggered'
let registeredHotkey = null;

function createMainWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const width = 480;
  const height = 720;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: Math.round((sw - width) / 2),
    y: Math.round((sh - height) / 2),
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    backgroundColor: '#0b0d10',
    title: "Deadman's Switch",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
    disarm();
  });
}

function registerHotkey(accelerator) {
  unregisterHotkey();
  try {
    const ok = globalShortcut.register(accelerator, onHotkeyPressed);
    registeredHotkey = ok ? accelerator : null;
    return ok;
  } catch (err) {
    registeredHotkey = null;
    return false;
  }
}

function unregisterHotkey() {
  if (registeredHotkey) {
    globalShortcut.unregister(registeredHotkey);
    registeredHotkey = null;
  }
}

function arm(hotkey) {
  const ok = registerHotkey(hotkey);
  armState = ok ? 'armed' : 'idle';
  return ok;
}

function disarm() {
  unregisterHotkey();
  if (armState !== 'triggered') armState = 'idle';
}

async function onHotkeyPressed() {
  if (armState !== 'armed') return; // hotkey does nothing unless the switch was actually armed
  armState = 'triggered';
  unregisterHotkey();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('switch:triggered');
  }

  const config = loadConfig();
  // Give the trigger animation a beat to play before we actually tear things down.
  await new Promise((resolve) => setTimeout(resolve, 450));

  try {
    const { keepAliveWindow: survivor } = await performAction(config);
    keepAliveWindow = survivor || null;
  } finally {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
    mainWindow = null;
    if (!keepAliveWindow) app.quit();
  }
}

// ---- IPC surface used by the renderer via preload.js ----

ipcMain.handle('config:get', () => loadConfig());

ipcMain.handle('config:save', (_evt, partial) => saveConfig(partial));

ipcMain.handle('processes:list', () => listRunningProcesses());

ipcMain.handle('switch:arm', (_evt, hotkey) => arm(hotkey));

ipcMain.handle('switch:disarm', () => {
  disarm();
  return true;
});

ipcMain.handle('window:close', () => {
  disarm();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

app.on('window-all-closed', () => {
  if (!keepAliveWindow) app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.whenReady().then(() => {
  createMainWindow();
});
