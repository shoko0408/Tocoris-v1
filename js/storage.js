const HIGH_SCORE_KEY = 'bottomup-highscore';
const ENDLESS_HIGH_SCORE_KEY = 'bottomup-highscore-endless';
const SFX_KEY = 'bottomup-sfx-enabled';
const BGM_KEY = 'bottomup-bgm-enabled';
const STATS_KEY = 'bottomup-stats';
const ACHIEVEMENTS_KEY = 'bottomup-achievements';

const DEFAULT_STATS = {
  totalPlays: 0,
  totalLines: 0,
  bestCombo: 0,
  rainbowCleared: 0,
  maxStageCleared: 0,
  endlessBestLines: 0,
};

// プライベートブラウズ等でlocalStorageが使えない環境でもゲームが起動できるよう、
// 読み書き失敗時は無視してデフォルト値にフォールバックする。
function loadScore(key) {
  try {
    const raw = localStorage.getItem(key);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveScore(key, score) {
  try {
    localStorage.setItem(key, String(score));
  } catch {
    // 保存できなくてもゲーム進行には影響させない
  }
}

export function loadHighScore() {
  return loadScore(HIGH_SCORE_KEY);
}

export function saveHighScore(score) {
  saveScore(HIGH_SCORE_KEY, score);
}

export function loadEndlessHighScore() {
  return loadScore(ENDLESS_HIGH_SCORE_KEY);
}

export function saveEndlessHighScore(score) {
  saveScore(ENDLESS_HIGH_SCORE_KEY, score);
}

function loadBool(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? defaultValue : raw === 'true';
  } catch {
    return defaultValue;
  }
}

function saveBool(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // 保存できなくても設定はメモリ上でそのターン有効なままにする
  }
}

export function loadSfxEnabled() {
  return loadBool(SFX_KEY, true);
}

export function saveSfxEnabled(enabled) {
  saveBool(SFX_KEY, enabled);
}

export function loadBgmEnabled() {
  return loadBool(BGM_KEY, true);
}

export function saveBgmEnabled(enabled) {
  saveBool(BGM_KEY, enabled);
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // 保存できなくても統計はメモリ上でそのセッション有効なままにする
  }
}

export function loadUnlockedAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUnlockedAchievements(ids) {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids));
  } catch {
    // 保存できなくても実績判定はそのセッション中は有効なままにする
  }
}
