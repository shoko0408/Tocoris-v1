import { ROWS, COLS } from './board.js';
import { getSpecialCssClass } from './specials.js';

// セルのデータ({ color, special } または null)から表示クラス名を決める
function cellClassFor(data) {
  if (!data) return 'cell';
  const visual = data.special ? getSpecialCssClass(data.special) : data.color;
  return `cell filled ${visual}`;
}

function buildPreviewCells(container) {
  container.innerHTML = '';
  const cells = [];
  for (let i = 0; i < COLS; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    container.appendChild(cell);
    cells.push(cell);
  }
  return cells;
}

// 盤面を「列ごとのラッパー」で構築する。
// ピースが乗った列だけを独立して押し上げアニメーションさせるための構造。
function buildBoardColumns(container) {
  container.innerHTML = '';
  const columns = [];
  for (let c = 0; c < COLS; c++) {
    const colEl = document.createElement('div');
    colEl.className = 'board-col';
    const cells = [];
    for (let i = 0; i < ROWS; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      colEl.appendChild(cell);
      cells.push(cell);
    }
    container.appendChild(colEl);
    columns.push({ el: colEl, cells });
  }
  return columns;
}

export function createRenderer({
  boardEl,
  previewEl,
  scoreEl,
  highScoreEl,
  comboEl,
  stageLabelEl,
  stageNumberEl,
  stageProgressEl,
  timerFillEl,
  overlayEl,
  finalScoreEl,
  finalHighScoreEl,
  finalComboEl,
  finalStageLabelEl,
  finalStageEl,
  finalLinesEl,
  newRecordBadgeEl,
  resultAchievementsEl,
  resultAchievementsListEl,
  stageClearOverlayEl,
  stageClearTitleEl,
  stageClearSubEl,
  stageClearButtonEl,
  boardWrapEl,
  achievementToastEl,
  achievementToastIconEl,
  achievementToastNameEl,
}) {
  const boardColumns = buildBoardColumns(boardEl);
  const previewCells = buildPreviewCells(previewEl);

  // ボード行(0=最下段)を DOM 上の縦位置(0=最上段)へ変換
  function domIndexOf(boardRow) {
    return ROWS - 1 - boardRow;
  }

  function renderBoard(board) {
    for (let boardRow = 0; boardRow < ROWS; boardRow++) {
      const domIndex = domIndexOf(boardRow);
      for (let c = 0; c < COLS; c++) {
        boardColumns[c].cells[domIndex].className = cellClassFor(board[boardRow][c]);
      }
    }
  }

  function renderPreview(piece) {
    for (let c = 0; c < COLS; c++) {
      const filled = c >= piece.col && c < piece.col + piece.width;
      previewCells[c].className = cellClassFor(filled ? piece : null);
    }
  }

  function renderScore(score) {
    scoreEl.textContent = score;
  }

  function renderHighScore(highScore) {
    highScoreEl.textContent = highScore;
  }

  function renderCombo(combo) {
    comboEl.textContent = combo;
    if (combo > 0) {
      comboEl.classList.remove('combo-pop');
      // eslint-disable-next-line no-unused-expressions
      comboEl.offsetWidth; // reflow
      comboEl.classList.add('combo-pop');
    }
  }

  function renderStageHeader({ label, number, progress }) {
    stageLabelEl.textContent = label;
    stageNumberEl.textContent = number;
    stageProgressEl.textContent = progress;
  }

  function renderTimer(ratio) {
    const pct = Math.max(0, Math.min(1, ratio)) * 100;
    timerFillEl.style.width = `${pct}%`;
    timerFillEl.classList.toggle('timer-warn', ratio < 0.3);
  }

  function showGameOver({
    score, highScore, maxCombo, reachedStage, stageLabel, linesThisRun, isNewRecord, achievementsThisRun = [],
  }) {
    finalScoreEl.textContent = score;
    finalHighScoreEl.textContent = highScore;
    finalComboEl.textContent = maxCombo;
    finalStageLabelEl.textContent = stageLabel;
    finalStageEl.textContent = reachedStage;
    finalLinesEl.textContent = linesThisRun;
    newRecordBadgeEl.classList.toggle('show', isNewRecord);

    resultAchievementsEl.classList.toggle('show', achievementsThisRun.length > 0);
    resultAchievementsListEl.innerHTML = achievementsThisRun
      .map((a) => `<div class="result-achievement-chip"><span>${a.icon}</span><span>${a.name}</span></div>`)
      .join('');

    overlayEl.classList.add('show');
  }

  function hideGameOver() {
    overlayEl.classList.remove('show');
  }

  function showStageClear({ stage, isFinal }) {
    stageClearTitleEl.textContent = isFinal ? 'ALL STAGE CLEAR!' : 'STAGE CLEAR!';
    stageClearSubEl.textContent = isFinal
      ? 'すべてのステージをクリアしました!'
      : `STAGE ${stage} CLEAR`;
    stageClearButtonEl.textContent = isFinal ? 'もう一度あそぶ' : '次のステージへ';
    stageClearOverlayEl.classList.add('show');
  }

  function hideStageClear() {
    stageClearOverlayEl.classList.remove('show');
  }

  function renderAll(state) {
    renderBoard(state.board);
    renderPreview(state.piece);
    renderScore(state.score);
    renderHighScore(state.highScore);
    renderCombo(state.combo);
  }

  // 新しく置かれたピースの列だけにポップインアニメーションを付ける
  function playPlacementAnimation(touchedCols) {
    const domIndex = domIndexOf(0);
    touchedCols.forEach((c) => {
      const cell = boardColumns[c].cells[domIndex];
      cell.classList.remove('cell-pop');
      // eslint-disable-next-line no-unused-expressions
      cell.offsetWidth; // reflow
      cell.classList.add('cell-pop');
    });
  }

  // ピースが乗った列だけを FLIP で1段押し上げアニメーションさせる
  function playPushUpAnimation(touchedCols) {
    touchedCols.forEach((c) => {
      const colEl = boardColumns[c].el;
      const cellHeight = colEl.clientHeight / ROWS;
      colEl.style.transition = 'none';
      colEl.style.transform = `translateY(${cellHeight}px)`;
      // eslint-disable-next-line no-unused-expressions
      colEl.offsetHeight; // reflow
      colEl.style.transition = 'transform 160ms cubic-bezier(.22,.9,.35,1)';
      colEl.style.transform = 'translateY(0)';
    });
  }

  // 揃った行を光らせてから消す(消去エフェクト)
  function flashLines(fullRows) {
    fullRows.forEach((boardRow) => {
      const domIndex = domIndexOf(boardRow);
      for (let c = 0; c < COLS; c++) {
        boardColumns[c].cells[domIndex].classList.add('line-flash');
      }
    });
  }

  // 特殊ブロック(レインボー等)の追加消去マスを、通常より派手に光らせる
  function flashBonusCells(bonusCells) {
    bonusCells.forEach(([boardRow, c]) => {
      if (c < 0 || c >= COLS) return;
      const domIndex = domIndexOf(boardRow);
      if (domIndex < 0 || domIndex >= ROWS) return;
      boardColumns[c].cells[domIndex].classList.add('bonus-flash');
    });
  }

  // レインボー発動時の盤面の派手なバースト演出
  function rainbowBurst() {
    boardEl.classList.remove('rainbow-burst');
    // eslint-disable-next-line no-unused-expressions
    boardEl.offsetWidth; // reflow
    boardEl.classList.add('rainbow-burst');
  }

  // 画面の軽いシェイク(ライン消去時の演出)
  function shakeBoard() {
    boardWrapEl.classList.remove('shake');
    // eslint-disable-next-line no-unused-expressions
    boardWrapEl.offsetWidth; // reflow
    boardWrapEl.classList.add('shake');
  }

  // 実績解除トースト(複数同時解除時は1件ずつ順番に表示する)
  let toastQueue = [];
  let toastActive = false;

  function displayNextToast() {
    if (toastQueue.length === 0) {
      toastActive = false;
      return;
    }
    toastActive = true;
    const achievement = toastQueue.shift();
    achievementToastIconEl.textContent = achievement.icon;
    achievementToastNameEl.textContent = achievement.name;
    achievementToastEl.classList.add('show');
    setTimeout(() => {
      achievementToastEl.classList.remove('show');
      setTimeout(displayNextToast, 300);
    }, 2200);
  }

  function showAchievementToast(achievement) {
    toastQueue.push(achievement);
    if (!toastActive) displayNextToast();
  }

  return {
    renderAll,
    renderStageHeader,
    renderTimer,
    showGameOver,
    hideGameOver,
    showStageClear,
    hideStageClear,
    playPlacementAnimation,
    playPushUpAnimation,
    flashLines,
    flashBonusCells,
    rainbowBurst,
    shakeBoard,
    showAchievementToast,
  };
}
