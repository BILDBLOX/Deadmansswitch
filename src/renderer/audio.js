'use strict';

// All sound here is synthesized with the Web Audio API — no audio files,
// so the app stays dependency-free. Exposed as window.dmsAudio.
(() => {
  let ctx = null;
  let klaxon = null;
  let enabled = true;

  function setEnabled(v) {
    enabled = !!v;
    if (!enabled) stopKlaxon();
  }

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // A short burst of decaying noise, layered under the tones below for
  // mechanical "texture" (clicks/thunks aren't pure tones in real life).
  function clickNoise(duration, volume) {
    const c = getCtx();
    const now = c.currentTime;
    const size = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, size, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(gain).connect(c.destination);
    src.start(now);
  }

  function playCoverOpen() {
    if (!enabled) return;
    const c = getCtx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.22);
    clickNoise(0.04, 0.15);
  }

  function playThunk() {
    if (!enabled) return;
    const c = getCtx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.26);
    clickNoise(0.05, 0.3);
  }

  function playDisarm() {
    if (!enabled) return;
    const c = getCtx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.2);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  // Two-tone alarm "whoop" — a sawtooth carrier swept by a slow LFO —
  // loops for as long as the switch stays armed.
  function startKlaxon() {
    if (!enabled || klaxon) return;
    const c = getCtx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 500;
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(0.09, now, 0.05);
    osc.connect(gain).connect(c.destination);

    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.85;
    lfoGain.gain.value = 150;
    lfo.connect(lfoGain).connect(osc.frequency);

    osc.start();
    lfo.start();
    klaxon = { osc, gain, lfo, lfoGain };
  }

  function stopKlaxon() {
    if (!klaxon) return;
    const c = getCtx();
    const now = c.currentTime;
    klaxon.gain.gain.cancelScheduledValues(now);
    klaxon.gain.gain.setTargetAtTime(0.0001, now, 0.05);
    const { osc, lfo } = klaxon;
    osc.stop(now + 0.2);
    lfo.stop(now + 0.2);
    klaxon = null;
  }

  // Deep descending boom for the trigger moment — stops the klaxon first.
  function playTriggerBlast() {
    stopKlaxon();
    if (!enabled) return;
    const c = getCtx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.65);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.8);
    clickNoise(0.08, 0.35);
  }

  window.dmsAudio = {
    setEnabled,
    playCoverOpen,
    playThunk,
    playDisarm,
    startKlaxon,
    stopKlaxon,
    playTriggerBlast
  };
})();
