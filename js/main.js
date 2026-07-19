import { registerScreens, showScreen } from './screenManager.js';
import { COLS } from './board.js';
import {
  createGame,
  moveLeft,
  moveRight,
  setPieceColumn,
  placePiece,
  resolveClears,
  advanceStage,
  resetGame,
  getCurrentStageConfig,
} from './game.js';
import { TOTAL_STAGES } from './stages.js';
import { createRenderer } from './render.js';
import * as audio from './audio.js';
import {
  createStatsTracker,
  recordGameStart,
  recordLinesCleared,
  recordRainbowTriggered,
  recordBestCombo,
  recordStageCleared,
  recordEndlessRun,
  checkNewAchievements,
} from './stats.js';
import { ACHIEVEMENTS } from './achievements.js';

const LINE_FLASH_MS = 220;
const TIMER_TICK_MS = 100;

function init() {
  registerScreens();

  const state = createGame();
  const renderer = createRenderer({
    boardEl: document.getElementById('board'),
    previewEl: document.getElementById('preview-row'),
    scoreEl: document.getElementById('score'),
    highScoreEl: document.getElementById('high-score'),
    comboEl: document.getElementById('combo'),
    stageLabelEl: document.getElementById('stage-label'),
    stageNumberEl: document.getElementById('stage-number'),
    stageProgressEl: document.getElementById('stage-progress'),
    timerFillEl: document.getElementById('timer-fill'),
    overlayEl: document.getElementById('overlay-gameover'),
    finalScoreEl: document.getElementById('final-score'),
    finalHighScoreEl: document.getElementById('final-high-score'),
    finalComboEl: document.getElementById('final-combo'),
    finalStageLabelEl: document.getElementById('final-stage-label'),
    finalStageEl: document.getElementById('final-stage'),
    finalLinesEl: document.getElementById('final-lines'),
    newRecordBadgeEl: document.getElementById('new-record-badge'),
    resultAchievementsEl: document.getElementById('result-achievements'),
    resultAchievementsListEl: document.getElementById('result-achievements-list'),
    stageClearOverlayEl: document.getElementById('overlay-stageclear'),
    stageClearTitleEl: document.getElementById('stageclear-title'),
    stageClearSubEl: document.getElementById('stageclear-sub'),
    stageClearButtonEl: document.getElementById('btn-next-stage'),
    boardWrapEl: document.getElementById('board-wrap'),
    achievementToastEl: document.getElementById('achievement-toast'),
    achievementToastIconEl: document.getElementById('achievement-toast-icon'),
    achievementToastNameEl: document.getElementById('achievement-toast-name'),
  });

  const tracker = createStatsTracker();
  let highScoreAtRunStart = state.highScore;
  let runUnlockedAchievements = [];

  let timerIntervalId = null;
  let resolveTimeoutId = null;
  let isResolving = false;

  const btnDecide = document.getElementById('btn-decide');
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');

  // 決定〜ライン消去演出の間、入力を受け付けないようにする(連打による二重処理防止)
  function setControlsEnabled(enabled) {
    isResolving = !enabled;
    btnDecide.disabled = !enabled;
    btnLeft.disabled = !enabled;
    btnRight.disabled = !enabled;
  }

  function render() {
    renderer.renderAll(state);
    if (state.mode === 'endless') {
      const { level } = getCurrentStageConfig(state);
      renderer.renderStageHeader({ label: 'LEVEL', number: level, progress: `LINES ${state.linesThisRun}` });
    } else {
      const { requiredLines } = getCurrentStageConfig(state);
      renderer.renderStageHeader({
        label: 'STAGE', number: state.stage, progress: `LINE ${state.linesInStage}/${requiredLines}`,
      });
    }
  }

  function clearTurnTimer() {
    if (timerIntervalId !== null) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
  }

  // ライン消去演出待ちの間に画面遷移されても、後から結果オーバーレイが出てこないようにする
  function cancelPendingResolve() {
    if (resolveTimeoutId !== null) {
      clearTimeout(resolveTimeoutId);
      resolveTimeoutId = null;
    }
  }

  function startTurnTimer() {
    clearTurnTimer();
    const duration = getCurrentStageConfig(state).turnTimeSec;
    let remaining = duration;
    renderer.renderTimer(1);
    timerIntervalId = setInterval(() => {
      remaining -= TIMER_TICK_MS / 1000;
      renderer.renderTimer(remaining / duration);
      if (remaining <= 0) {
        clearTurnTimer();
        handleDecide();
      }
    }, TIMER_TICK_MS);
  }

  function checkAchievements() {
    const newlyUnlocked = checkNewAchievements(tracker, state.highScore);
    newlyUnlocked.forEach((a) => {
      renderer.showAchievementToast(a);
      runUnlockedAchievements.push(a);
    });
  }

  function finalizeRun() {
    if (state.mode === 'endless') {
      recordEndlessRun(tracker, state.linesThisRun);
    }
    checkAchievements();
  }

  function buildResultPayload() {
    const isEndless = state.mode === 'endless';
    return {
      score: state.score,
      highScore: state.highScore,
      maxCombo: state.maxCombo,
      stageLabel: isEndless ? 'REACHED LEVEL' : 'REACHED STAGE',
      reachedStage: isEndless ? getCurrentStageConfig(state).level : state.stage,
      linesThisRun: state.linesThisRun,
      isNewRecord: state.score > highScoreAtRunStart,
      achievementsThisRun: runUnlockedAchievements,
    };
  }

  function startNewGame(mode) {
    cancelPendingResolve();
    resetGame(state, mode);
    highScoreAtRunStart = state.highScore;
    runUnlockedAchievements = [];
    recordGameStart(tracker);
    renderer.hideGameOver();
    renderer.hideStageClear();
    render();
    showScreen('screen-game');
    setControlsEnabled(true);
    startTurnTimer();
    checkAchievements();
  }

  function handleNextStage() {
    if (state.stage >= TOTAL_STAGES) {
      resetGame(state);
    } else {
      advanceStage(state);
    }
    renderer.hideStageClear();
    render();
    setControlsEnabled(true);
    startTurnTimer();
  }

  function handleDecide() {
    if (isResolving) return;
    setControlsEnabled(false);
    clearTurnTimer();

    const { fullRows, bonusCells, gameOver, touchedCols } = placePiece(state);
    if (gameOver) {
      render();
      audio.playGameOver();
      renderer.showGameOver(buildResultPayload());
      finalizeRun();
      return;
    }

    audio.playDecide();
    render();
    renderer.playPushUpAnimation(touchedCols);
    renderer.playPlacementAnimation(touchedCols);

    if (fullRows.length === 0) {
      const result = resolveClears(state, fullRows, bonusCells);
      recordBestCombo(tracker, state.maxCombo);
      render();
      if (result.gameOver) {
        audio.playGameOver();
        renderer.showGameOver(buildResultPayload());
        finalizeRun();
        return;
      }
      setControlsEnabled(true);
      startTurnTimer();
      checkAchievements();
      return;
    }

    audio.playLineClear(fullRows.length);
    renderer.flashLines(fullRows);
    if (bonusCells.length > 0) {
      audio.playRainbow();
      renderer.flashBonusCells(bonusCells);
      renderer.rainbowBurst();
    }
    resolveTimeoutId = setTimeout(() => {
      resolveTimeoutId = null;
      const clearedStage = state.stage;
      const result = resolveClears(state, fullRows, bonusCells);
      recordLinesCleared(tracker, fullRows.length);
      recordBestCombo(tracker, state.maxCombo);
      if (bonusCells.length > 0) recordRainbowTriggered(tracker);
      render();
      renderer.shakeBoard();

      if (result.stageCleared) {
        recordStageCleared(tracker, clearedStage);
        audio.playStageClear();
        renderer.showStageClear({ stage: clearedStage, isFinal: clearedStage >= TOTAL_STAGES });
        checkAchievements();
        return;
      }
      if (result.gameOver) {
        audio.playGameOver();
        renderer.showGameOver(buildResultPayload());
        finalizeRun();
        return;
      }
      setControlsEnabled(true);
      startTurnTimer();
      checkAchievements();
    }, LINE_FLASH_MS);
  }

  function renderAchievementsScreen() {
    document.getElementById('stat-total-plays').textContent = tracker.stats.totalPlays;
    document.getElementById('stat-total-lines').textContent = tracker.stats.totalLines;

    const listEl = document.getElementById('achievement-list');
    listEl.innerHTML = '';
    ACHIEVEMENTS.forEach((a) => {
      const unlocked = tracker.unlocked.has(a.id);
      const item = document.createElement('div');
      item.className = unlocked ? 'achievement-item' : 'achievement-item locked';
      item.innerHTML = `
        <span class="achievement-icon">${unlocked ? a.icon : '❔'}</span>
        <div class="achievement-info">
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  function initAchievementsScreen() {
    document.getElementById('btn-open-achievements').addEventListener('click', () => {
      audio.playButtonTap();
      renderAchievementsScreen();
      showScreen('screen-achievements');
    });
    document.getElementById('btn-achievements-back').addEventListener('click', () => {
      audio.playButtonTap();
      showScreen('screen-title');
    });
  }

  function initAudioUnlock() {
    const unlock = () => {
      audio.unlockAudio();
      audio.startBgm();
      document.removeEventListener('pointerdown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
  }

  function initSettingsScreen() {
    const toggleSfx = document.getElementById('toggle-sfx');
    const toggleBgm = document.getElementById('toggle-bgm');
    toggleSfx.checked = audio.isSfxEnabled();
    toggleBgm.checked = audio.isBgmEnabled();

    toggleSfx.addEventListener('change', () => {
      audio.setSfxEnabled(toggleSfx.checked);
      audio.playButtonTap();
    });
    toggleBgm.addEventListener('change', () => {
      audio.setBgmEnabled(toggleBgm.checked);
    });

    document.getElementById('btn-open-settings').addEventListener('click', () => {
      audio.playButtonTap();
      showScreen('screen-settings');
    });
    document.getElementById('btn-settings-back').addEventListener('click', () => {
      audio.playButtonTap();
      showScreen('screen-title');
    });
  }

  initAudioUnlock();
  initSettingsScreen();
  initAchievementsScreen();

  document.getElementById('btn-start-stage').addEventListener('click', () => {
    audio.playButtonTap();
    startNewGame('stage');
  });
  document.getElementById('btn-start-endless').addEventListener('click', () => {
    audio.playButtonTap();
    startNewGame('endless');
  });
  document.getElementById('btn-retry').addEventListener('click', () => {
    audio.playButtonTap();
    startNewGame(state.mode);
  });
  document.getElementById('btn-result-title').addEventListener('click', () => {
    audio.playButtonTap();
    renderer.hideGameOver();
    showScreen('screen-title');
  });
  document.getElementById('btn-next-stage').addEventListener('click', () => {
    audio.playButtonTap();
    handleNextStage();
  });
  document.getElementById('btn-back').addEventListener('click', () => {
    audio.playButtonTap();
    clearTurnTimer();
    cancelPendingResolve();
    setControlsEnabled(true);
    showScreen('screen-title');
  });

  document.getElementById('btn-left').addEventListener('click', () => {
    audio.playMove();
    moveLeft(state);
    render();
  });
  document.getElementById('btn-right').addEventListener('click', () => {
    audio.playMove();
    moveRight(state);
    render();
  });
  document.getElementById('btn-decide').addEventListener('click', handleDecide);

  setupDrag(document.getElementById('preview-row'), state, render, () => isResolving);

  render();
}

function setupDrag(previewEl, state, render, isResolving) {
  let dragging = false;
  let startX = 0;
  let startCol = 0;

  previewEl.addEventListener('pointerdown', (e) => {
    if (isResolving()) return;
    dragging = true;
    startX = e.clientX;
    startCol = state.piece.col;
    previewEl.setPointerCapture(e.pointerId);
  });

  previewEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const cellWidth = previewEl.clientWidth / COLS;
    const deltaCols = Math.round((e.clientX - startX) / cellWidth);
    setPieceColumn(state, startCol + deltaCols);
    render();
  });

  function endDrag() {
    dragging = false;
  }
  previewEl.addEventListener('pointerup', endDrag);
  previewEl.addEventListener('pointercancel', endDrag);
}

document.addEventListener('DOMContentLoaded', init);
