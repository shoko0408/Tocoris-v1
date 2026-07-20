import { ROWS, COLS } from './board.js';
import { getSpecialCssClass } from './specials.js';

// セルのデータ({ color, special } または null)から表示クラス名を決める
function cellClassFor(data) {
  if (!data) return 'cell';
  const visual = data.special ? getSpecialCssClass(data.special) : data.color;
  return `cell filled ${visual}`;
}

// ブロックの塊全体がひと目でわかるよう、その塊の左端・右端のセルに枠線用の
// クラスを付ける(上下は常に枠を付ける。ブロックは常に1行分の高さのため)
function classNameForRow(rowData, c) {
  const cellData = rowData[c];
  if (!cellData) return 'cell';

  const leftData = c > 0 ? rowData[c - 1] : null;
  const rightData = c < rowData.length - 1 ? rowData[c + 1] : null;
  const isLeftEdge = !leftData || leftData.pieceId !== cellData.pieceId;
  const isRightEdge = !rightData || rightData.pieceId !== cellData.pieceId;

  let className = `${cellClassFor(cellData)} piece-outline`;
  if (isLeftEdge) className += ' piece-edge-left';
  if (isRightEdge) className += ' piece-edge-right';
  return className;
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

  // 画面上のタップ/ドラッグ座標(clientX/Y)から、盤面の列・行番号を求める
  function columnFromClientX(clientX) {
    const rect = boardEl.getBoundingClientRect();
    const col = Math.floor(((clientX - rect.left) / rect.width) * COLS);
    return Math.max(0, Math.min(COLS - 1, col));
  }

  function rowFromClientY(clientY) {
    const rect = boardEl.getBoundingClientRect();
    const domIndex = Math.floor(((clientY - rect.top) / rect.height) * ROWS);
    const clampedDomIndex = Math.max(0, Math.min(ROWS - 1, domIndex));
    return ROWS - 1 - clampedDomIndex;
  }

  // 1マス分の幅(px)。ドラッグ量を列数に変換する際に使う
  function getCellWidth() {
    return boardEl.getBoundingClientRect().width / COLS;
  }

  function renderBoard(board) {
    for (let boardRow = 0; boardRow < ROWS; boardRow++) {
      const domIndex = domIndexOf(boardRow);
      const rowData = board[boardRow];
      for (let c = 0; c < COLS; c++) {
        boardColumns[c].cells[domIndex].className = classNameForRow(rowData, c);
      }
    }
  }

  // 次にせり出してくるブロック群の予告表示(操作不可、見た目のみ)
  function renderPreview(pendingSpawn) {
    const segmentByCol = new Array(COLS).fill(null);
    pendingSpawn.forEach((seg) => {
      for (let i = 0; i < seg.width; i++) {
        segmentByCol[seg.col + i] = seg;
      }
    });
    for (let c = 0; c < COLS; c++) {
      previewCells[c].className = classNameForRow(segmentByCol, c);
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
    renderPreview(state.pendingSpawn);
    renderScore(state.score);
    renderHighScore(state.highScore);
    renderCombo(state.combo);
  }

  // 新しく入ってきたブロックの列だけにポップインアニメーションを付ける
  function playPlacementAnimation(newCols) {
    const domIndex = domIndexOf(0);
    newCols.forEach((c) => {
      const cell = boardColumns[c].cells[domIndex];
      cell.classList.remove('cell-pop');
      // eslint-disable-next-line no-unused-expressions
      cell.offsetWidth; // reflow
      cell.classList.add('cell-pop');
    });
  }

  // 盤面全体(8列すべて)を FLIP で1段押し上げアニメーションさせる
  function playPushUpAnimation() {
    for (let c = 0; c < COLS; c++) {
      const colEl = boardColumns[c].el;
      const cellHeight = colEl.clientHeight / ROWS;
      colEl.style.transition = 'none';
      colEl.style.transform = `translateY(${cellHeight}px)`;
      // eslint-disable-next-line no-unused-expressions
      colEl.offsetHeight; // reflow
      colEl.style.transition = 'transform 160ms cubic-bezier(.22,.9,.35,1)';
      colEl.style.transform = 'translateY(0)';
    }
  }

  // ── 既存ブロックのドラッグスライド用プレビュー(実データには触れず見た目だけ動かす) ──
  let dragGhost = null;

  function beginDragGhost(piece, cellData) {
    dragGhost = {
      row: piece.row, width: piece.width, className: cellClassFor(cellData), lastCol: piece.startCol,
    };
  }

  function updateDragGhost(candidateCol) {
    if (!dragGhost) return;
    const domIndex = domIndexOf(dragGhost.row);
    for (let i = 0; i < dragGhost.width; i++) {
      boardColumns[dragGhost.lastCol + i].cells[domIndex].className = 'cell';
    }
    for (let i = 0; i < dragGhost.width; i++) {
      boardColumns[candidateCol + i].cells[domIndex].className = dragGhost.className;
    }
    dragGhost.lastCol = candidateCol;
  }

  function endDragGhost() {
    dragGhost = null;
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
    columnFromClientX,
    rowFromClientY,
    getCellWidth,
    beginDragGhost,
    updateDragGhost,
    endDragGhost,
    flashLines,
    flashBonusCells,
    rainbowBurst,
    shakeBoard,
    showAchievementToast,
  };
}
