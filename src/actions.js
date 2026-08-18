'use strict';

const { execFile } = require('child_process');
const { BrowserWindow } = require('electron');
const { killProcesses } = require('./processes');

function signOut() {
  execFile('shutdown', ['/l'], { windowsHide: true }, () => {});
}

function shutDown() {
  execFile('shutdown', ['/s', '/t', '0'], { windowsHide: true }, () => {});
}

/**
 * Opens a plain, boring, fullscreen "cover" window loaded with the
 * configured URL — the decoy tab that's left on screen after everything
 * else closes. Returns the window so the caller can keep the app alive
 * instead of quitting once the control window closes.
 */
function openDummyTab(url) {
  const win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.setMenuBarVisibility(false);
  win.loadURL(url || 'about:blank').catch(() => {});
  return win;
}

/**
 * Runs the configured trigger action. Returns { keepAliveWindow } —
 * a BrowserWindow the main process should keep open (not quit under),
 * or null if the app should fully exit once this resolves.
 */
async function performAction(config) {
  await killProcesses(config.processes);

  switch (config.action) {
    case 'processes_signout':
      signOut();
      return { keepAliveWindow: null };
    case 'processes_shutdown':
      shutDown();
      return { keepAliveWindow: null };
    case 'processes_dummy':
      return { keepAliveWindow: openDummyTab(config.dummyUrl) };
    case 'processes':
    default:
      return { keepAliveWindow: null };
  }
}

module.exports = { performAction, signOut, shutDown, openDummyTab };
