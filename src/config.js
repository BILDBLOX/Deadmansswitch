'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Shipped as sensible starting picks — the user edits this list freely
// in Settings before ever arming the switch. Nothing here is protected;
// see processes.js for the list that genuinely can't be touched.
const DEFAULT_CONFIG = {
  // Process names (as Windows shows them in Task Manager, e.g. "chrome.exe")
  processes: [
    'chrome.exe',
    'msedge.exe',
    'firefox.exe',
    'Discord.exe',
    'Spotify.exe',
    'Steam.exe',
    'EpicGamesLauncher.exe',
    'battle.net.exe'
  ],
  // One of: 'processes' | 'processes_signout' | 'processes_shutdown' | 'processes_dummy'
  action: 'processes',
  // Used only when action === 'processes_dummy'
  dummyUrl: 'https://docs.google.com/document/u/0/',
  // Electron accelerator string. Must be registerable as a global shortcut.
  hotkey: 'F3',
  // Klaxon while armed + thunk/blast sound effects. Purely a renderer-side
  // preference — synthesized with Web Audio, no files to manage.
  soundEnabled: true
};

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  const configPath = getConfigPath();
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const saved = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...saved };
  } catch (err) {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(partial) {
  const merged = { ...loadConfig(), ...partial };
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

module.exports = { DEFAULT_CONFIG, loadConfig, saveConfig, getConfigPath };
