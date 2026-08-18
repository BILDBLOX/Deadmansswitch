'use strict';

const { execFile } = require('child_process');
const path = require('path');

// Hard-coded, non-configurable. No matter what a user selects in Settings
// (or what a corrupted/tampered config file contains), nothing on this list
// is ever passed to taskkill. This is what keeps the switch from being able
// to "actively kill" the PC — it can end user-facing apps, not the OS.
const PROTECTED_PROCESSES = new Set([
  'system', 'system idle process', 'registry', 'secure system',
  'memory compression', 'smss.exe', 'csrss.exe', 'wininit.exe',
  'services.exe', 'lsass.exe', 'winlogon.exe', 'explorer.exe', 'dwm.exe',
  'svchost.exe', 'taskhostw.exe', 'fontdrvhost.exe', 'sihost.exe',
  'ctfmon.exe', 'runtimebroker.exe', 'conhost.exe', 'spoolsv.exe',
  'wudfhost.exe', 'searchindexer.exe', 'searchapp.exe', 'searchhost.exe',
  'shellexperiencehost.exe', 'startmenuexperiencehost.exe', 'dllhost.exe',
  'textinputhost.exe', 'logonui.exe', 'msmpeng.exe', 'nissrv.exe',
  'securityhealthservice.exe', 'securityhealthsystray.exe', 'wmiprvse.exe',
  'lsaiso.exe', 'wininit.exe', 'audiodg.exe', 'trustedinstaller.exe',
  'systemsettings.exe', 'applicationframehost.exe'
]);

function ownProcessNames() {
  // Never allow the switch to be pointed at itself.
  const exe = path.basename(process.execPath).toLowerCase();
  return new Set([exe, 'electron.exe']);
}

function isProtected(name) {
  const lower = String(name || '').trim().toLowerCase();
  if (!lower) return true;
  return PROTECTED_PROCESSES.has(lower) || ownProcessNames().has(lower);
}

/**
 * Lists distinct running process image names via `tasklist`, filtered
 * so protected/system processes never even show up as selectable.
 */
function listRunningProcesses() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const seen = new Map();
      for (const line of stdout.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // CSV: "name.exe","pid","session","session#","mem"
        const match = trimmed.match(/^"([^"]+)"/);
        if (!match) continue;
        const name = match[1];
        if (isProtected(name)) continue;
        seen.set(name.toLowerCase(), name);
      }
      resolve(Array.from(seen.values()).sort((a, b) => a.localeCompare(b)));
    });
  });
}

/**
 * Force-closes every named process (and its child tree). Silently skips
 * anything protected or not currently running. Never rejects — a process
 * that isn't running is not an error for our purposes.
 */
function killProcesses(names) {
  const targets = Array.from(new Set((names || []).map((n) => String(n).trim()).filter(Boolean)))
    .filter((n) => !isProtected(n));

  return Promise.all(
    targets.map(
      (name) =>
        new Promise((resolve) => {
          execFile('taskkill', ['/F', '/T', '/IM', name], { windowsHide: true }, () => resolve(name));
        })
    )
  );
}

module.exports = { PROTECTED_PROCESSES, isProtected, listRunningProcesses, killProcesses };
