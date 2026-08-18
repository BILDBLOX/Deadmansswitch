'use strict';

(() => {
  const hatchWrap = document.getElementById('hatchWrap');
  const hatchLid = document.getElementById('hatchLid');
  const coreButton = document.getElementById('coreButton');
  const readout = document.getElementById('readout');
  const disarmBtn = document.getElementById('disarmBtn');
  const statusPill = document.getElementById('statusPill');
  const hotkeyLabel = document.getElementById('hotkeyLabel');
  const triggerFlash = document.getElementById('triggerFlash');
  const closeBtn = document.getElementById('closeBtn');

  const settingsBtn = document.getElementById('settingsBtn');
  const footerSettingsLink = document.getElementById('footerSettingsLink');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const settingsSaveBtn = document.getElementById('settingsSaveBtn');
  const settingsStatus = document.getElementById('settingsStatus');

  const customProcessInput = document.getElementById('customProcessInput');
  const addProcessBtn = document.getElementById('addProcessBtn');
  const selectedProcessList = document.getElementById('selectedProcessList');
  const runningProcessList = document.getElementById('runningProcessList');
  const refreshProcessesBtn = document.getElementById('refreshProcessesBtn');
  const dummyUrlInput = document.getElementById('dummyUrlInput');
  const dummyUrlRow = document.getElementById('dummyUrlRow');
  const hotkeyCapture = document.getElementById('hotkeyCapture');

  let config = null;
  let selected = new Set();
  let state = 'locked'; // locked | ready | armed | triggered

  // ---------------- Main switch state machine ----------------

  function setState(next) {
    state = next;
    hatchWrap.className = 'hatch-wrap' + (next === 'locked' ? '' : ` state-${next}`);
    coreButton.disabled = next !== 'ready';
    disarmBtn.hidden = next !== 'armed';

    statusPill.className = 'status-pill status-' + next;
    statusPill.textContent = { locked: 'LOCKED', ready: 'READY', armed: 'ARMED', triggered: 'TRIGGERED' }[next];

    readout.className = 'readout' + (next === 'armed' ? ' readout-armed' : next === 'triggered' ? ' readout-triggered' : '');
    readout.textContent = {
      locked: 'LIFT COVER TO BEGIN',
      ready: 'PRESS THE BUTTON TO ARM',
      armed: `ARMED — PRESS ${config?.hotkey || 'F3'} TO TRIGGER · DISARM TO CANCEL`,
      triggered: 'EXECUTING…'
    }[next];
  }

  hatchLid.addEventListener('click', () => {
    if (state === 'locked') setState('ready');
  });
  hatchLid.addEventListener('keydown', (e) => {
    if (state === 'locked' && (e.key === 'Enter' || e.key === ' ')) setState('ready');
  });

  coreButton.addEventListener('click', async () => {
    if (state !== 'ready') return;
    const ok = await window.api.arm(config?.hotkey || 'F3');
    if (ok) {
      setState('armed');
    } else {
      readout.textContent = 'COULD NOT REGISTER HOTKEY — CHECK IT ISN’T USED ELSEWHERE';
    }
  });

  async function doDisarm() {
    if (state !== 'armed') return;
    await window.api.disarm();
    setState('locked');
  }
  disarmBtn.addEventListener('click', doDisarm);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state === 'armed') doDisarm();
      else if (!settingsOverlay.hidden) closeSettings();
    }
  });

  window.api.onTriggered(() => {
    setState('triggered');
    triggerFlash.classList.add('flash-active');
  });

  closeBtn.addEventListener('click', () => window.api.closeWindow());

  // ---------------- Settings ----------------

  function openSettings() {
    if (state === 'armed' || state === 'triggered') return; // config is locked in once armed
    settingsOverlay.hidden = false;
    settingsStatus.textContent = '';
    refreshRunningProcesses();
  }
  function closeSettings() {
    settingsOverlay.hidden = true;
  }
  settingsBtn.addEventListener('click', openSettings);
  footerSettingsLink.addEventListener('click', openSettings);
  settingsCloseBtn.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = true));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).hidden = false;
    });
  });

  function renderSelectedList() {
    selectedProcessList.innerHTML = '';
    Array.from(selected).sort((a, b) => a.localeCompare(b)).forEach((name) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = name;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', () => {
        selected.delete(name);
        renderSelectedList();
        renderRunningList(lastRunningProcesses);
      });
      li.append(span, removeBtn);
      selectedProcessList.appendChild(li);
    });
    if (selected.size === 0) {
      const li = document.createElement('li');
      li.style.color = 'var(--text-dim)';
      li.style.justifyContent = 'center';
      li.textContent = 'nothing selected yet';
      selectedProcessList.appendChild(li);
    }
  }

  let lastRunningProcesses = [];
  function renderRunningList(names) {
    lastRunningProcesses = names;
    runningProcessList.innerHTML = '';
    if (!names.length) {
      const li = document.createElement('li');
      li.style.color = 'var(--text-dim)';
      li.textContent = 'no other processes found';
      runningProcessList.appendChild(li);
      return;
    }
    names.forEach((name) => {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected.has(name);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selected.add(name);
        else selected.delete(name);
        renderSelectedList();
      });
      const span = document.createElement('span');
      span.textContent = name;
      label.append(checkbox, span);
      li.appendChild(label);
      runningProcessList.appendChild(li);
    });
  }

  async function refreshRunningProcesses() {
    runningProcessList.innerHTML = '<li style="color:var(--text-dim)">loading…</li>';
    const names = await window.api.listProcesses();
    renderRunningList(names);
  }
  refreshProcessesBtn.addEventListener('click', refreshRunningProcesses);

  addProcessBtn.addEventListener('click', () => {
    const name = customProcessInput.value.trim();
    if (!name) return;
    selected.add(name);
    customProcessInput.value = '';
    renderSelectedList();
    renderRunningList(lastRunningProcesses);
  });
  customProcessInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addProcessBtn.click();
  });

  document.querySelectorAll('input[name="action"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) dummyUrlRow.style.display = radio.value === 'processes_dummy' ? 'flex' : 'none';
    });
  });

  // Hotkey capture
  let capturedHotkey = 'F3';
  let listening = false;
  hotkeyCapture.addEventListener('click', () => {
    listening = true;
    hotkeyCapture.classList.add('listening');
    hotkeyCapture.textContent = 'press a key…';
  });
  document.addEventListener('keydown', (e) => {
    if (!listening) return;
    e.preventDefault();
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    const parts = [];
    if (e.ctrlKey) parts.push('Control');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    let key = e.key;
    if (/^F\d{1,2}$/.test(key)) {
      // function keys already match Electron accelerator format
    } else if (key.length === 1) {
      key = key.toUpperCase();
    } else {
      const map = { ' ': 'Space', Escape: 'Esc', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };
      key = map[key] || key;
    }
    parts.push(key);

    capturedHotkey = parts.join('+');
    hotkeyCapture.textContent = capturedHotkey;
    hotkeyCapture.classList.remove('listening');
    listening = false;
  });

  function populateSettingsForm() {
    selected = new Set(config.processes || []);
    renderSelectedList();

    document.querySelectorAll('input[name="action"]').forEach((radio) => {
      radio.checked = radio.value === config.action;
    });
    dummyUrlRow.style.display = config.action === 'processes_dummy' ? 'flex' : 'none';
    dummyUrlInput.value = config.dummyUrl || '';

    capturedHotkey = config.hotkey || 'F3';
    hotkeyCapture.textContent = capturedHotkey;
  }

  settingsSaveBtn.addEventListener('click', async () => {
    const action = document.querySelector('input[name="action"]:checked')?.value || 'processes';
    const newConfig = {
      processes: Array.from(selected),
      action,
      dummyUrl: dummyUrlInput.value.trim() || 'about:blank',
      hotkey: capturedHotkey
    };
    config = await window.api.saveConfig(newConfig);
    hotkeyLabel.textContent = config.hotkey;
    setState('locked');
    settingsStatus.textContent = 'Saved.';
    setTimeout(() => closeSettings(), 500);
  });

  // ---------------- Boot ----------------

  async function init() {
    config = await window.api.getConfig();
    hotkeyLabel.textContent = config.hotkey;
    populateSettingsForm();
    setState('locked');
  }
  init();
})();
