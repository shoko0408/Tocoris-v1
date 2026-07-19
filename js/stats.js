import { loadStats, saveStats, loadUnlockedAchievements, saveUnlockedAchievements } from './storage.js';
import { ACHIEVEMENTS } from './achievements.js';

export function createStatsTracker() {
  return {
    stats: loadStats(),
    unlocked: new Set(loadUnlockedAchievements()),
  };
}

export function recordGameStart(tracker) {
  tracker.stats.totalPlays += 1;
  saveStats(tracker.stats);
}

export function recordLinesCleared(tracker, count) {
  if (count <= 0) return;
  tracker.stats.totalLines += count;
  saveStats(tracker.stats);
}

export function recordRainbowTriggered(tracker) {
  tracker.stats.rainbowCleared += 1;
  saveStats(tracker.stats);
}

export function recordBestCombo(tracker, combo) {
  if (combo > tracker.stats.bestCombo) {
    tracker.stats.bestCombo = combo;
    saveStats(tracker.stats);
  }
}

export function recordStageCleared(tracker, stageNumber) {
  if (stageNumber > tracker.stats.maxStageCleared) {
    tracker.stats.maxStageCleared = stageNumber;
    saveStats(tracker.stats);
  }
}

// エンドレスモードの1プレイで消したライン数のベストを記録する
export function recordEndlessRun(tracker, linesThisRun) {
  if (linesThisRun > tracker.stats.endlessBestLines) {
    tracker.stats.endlessBestLines = linesThisRun;
    saveStats(tracker.stats);
  }
}

// 現在の統計 + ハイスコアと照らして、新しく解除された実績だけを返す
export function checkNewAchievements(tracker, highScore) {
  const snapshot = { ...tracker.stats, highScore };
  const newlyUnlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!tracker.unlocked.has(achievement.id) && achievement.check(snapshot)) {
      tracker.unlocked.add(achievement.id);
      newlyUnlocked.push(achievement);
    }
  }
  if (newlyUnlocked.length > 0) {
    saveUnlockedAchievements([...tracker.unlocked]);
  }
  return newlyUnlocked;
}
