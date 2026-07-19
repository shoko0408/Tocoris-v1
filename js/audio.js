import { loadSfxEnabled, saveSfxEnabled, loadBgmEnabled, saveBgmEnabled } from './storage.js';

// 音源ファイルを一切使わず、Web Audio APIの発振器でSE/BGMを鳴らす。
// AudioContextはブラウザの自動再生制限により、ユーザー操作後でないと開始できないため
// unlockAudio() を最初のタップ等で呼び出して初期化する。

let audioCtx = null;
let sfxEnabled = loadSfxEnabled();
let bgmEnabled = loadBgmEnabled();
let bgmTimerId = null;

function ensureContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function unlockAudio() {
  ensureContext();
}

// 単発の音を鳴らす(SE・BGM共通の下請け関数)。有効/無効の判定は呼び出し側で行う。
function tone({ freq, duration = 0.12, type = 'square', gain = 0.15, when = 0, slideTo = null }) {
  const ctx = ensureContext();
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  }
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playSfx(...tones) {
  if (!sfxEnabled) return;
  tones.forEach((t) => tone(t));
}

// 対応端末のみ軽い振動フィードバックを付ける(効果音と同じON/OFFに連動させる)
function vibrate(pattern) {
  if (!sfxEnabled) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

const SEMI = (n) => Math.pow(2, n / 12);

export function playButtonTap() {
  playSfx({ freq: 880, duration: 0.04, type: 'square', gain: 0.06 });
}

export function playMove() {
  playSfx({ freq: 520, duration: 0.045, type: 'square', gain: 0.07 });
}

export function playDecide() {
  playSfx({ freq: 220, duration: 0.09, type: 'square', gain: 0.16, slideTo: 160 });
  vibrate(10);
}

export function playLineClear(lines) {
  const steps = [0, 4, 7, 12, 16];
  const count = Math.min(Math.max(lines, 1), steps.length);
  const notes = [];
  for (let i = 0; i < count; i++) {
    notes.push({ freq: 440 * SEMI(steps[i]), duration: 0.14, type: 'triangle', gain: 0.14, when: i * 0.055 });
  }
  playSfx(...notes);
  vibrate(20 + count * 10);
}

export function playRainbow() {
  const notes = [];
  for (let i = 0; i < 8; i++) {
    notes.push({ freq: 500 + Math.random() * 900, duration: 0.09, type: 'sine', gain: 0.1, when: i * 0.03 });
  }
  playSfx(...notes);
  vibrate([20, 30, 20, 30, 40]);
}

export function playStageClear() {
  const steps = [0, 4, 7, 12, 16];
  playSfx(...steps.map((semi, i) => ({
    freq: 330 * SEMI(semi), duration: 0.2, type: 'square', gain: 0.15, when: i * 0.12,
  })));
  vibrate([30, 40, 30, 40, 60]);
}

export function playGameOver() {
  const steps = [12, 7, 4, 0, -5];
  playSfx(...steps.map((semi, i) => ({
    freq: 330 * SEMI(semi), duration: 0.24, type: 'sawtooth', gain: 0.13, when: i * 0.15,
  })));
  vibrate(80);
}

// ── BGM: 短いフレーズをループ再生する ──
const BGM_NOTES = [330, 392, 440, 392, 330, 262, 330, 392];
const BGM_NOTE_SEC = 0.32;
const BGM_LOOP_SEC = BGM_NOTES.length * BGM_NOTE_SEC;

function scheduleBgmLoop() {
  if (!bgmEnabled) return;
  BGM_NOTES.forEach((freq, i) => {
    tone({ freq, duration: BGM_NOTE_SEC * 0.85, type: 'triangle', gain: 0.045, when: i * BGM_NOTE_SEC });
  });
  bgmTimerId = setTimeout(scheduleBgmLoop, BGM_LOOP_SEC * 1000);
}

export function startBgm() {
  if (!bgmEnabled || bgmTimerId !== null) return;
  ensureContext();
  scheduleBgmLoop();
}

export function stopBgm() {
  if (bgmTimerId !== null) {
    clearTimeout(bgmTimerId);
    bgmTimerId = null;
  }
}

export function isSfxEnabled() {
  return sfxEnabled;
}

export function isBgmEnabled() {
  return bgmEnabled;
}

export function setSfxEnabled(enabled) {
  sfxEnabled = enabled;
  saveSfxEnabled(enabled);
}

export function setBgmEnabled(enabled) {
  bgmEnabled = enabled;
  saveBgmEnabled(enabled);
  if (enabled) {
    startBgm();
  } else {
    stopBgm();
  }
}
