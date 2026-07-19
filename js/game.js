import {
  COLS,
  createBoard,
  isTopRowFilled,
  insertPieceIntoColumns,
  findFullRows,
  buildClearMap,
  clearCells,
} from './board.js';
import { createPiece, clampCol } from './piece.js';
import { loadHighScore, saveHighScore, loadEndlessHighScore, saveEndlessHighScore } from './storage.js';
import { getStageConfig, getEndlessConfig } from './stages.js';
import { collectBonusCells } from './specials.js';

const SCORE_TABLE = { 1: 100, 2: 300, 3: 600, 4: 1000 };
const PLACEMENT_SCORE = 10;
const COMBO_MULTIPLIER_STEP = 0.5; // コンボ1段につき+50%のスコア倍率
const COMBO_MULTIPLIER_MAX = 3; // 際限なくスコアが伸びないよう倍率に上限を設ける
const BONUS_CELL_SCORE = 20; // 特殊ブロックの追加消去1マスあたりのボーナス

export function createGame(mode = 'stage') {
  const state = {
    board: createBoard(),
    piece: null,
    score: 0,
    highScore: 0,
    combo: 0,
    maxCombo: 0,
    mode,
    stage: 1,
    linesInStage: 0,
    linesThisRun: 0,
    isGameOver: false,
    stageCleared: false,
  };
  startRun(state, mode);
  return state;
}

// モードに応じて、現在参照すべき難易度設定(必要ライン数・制限時間・幅の比率)を返す。
// ステージモードは固定テーブル、エンドレスモードは累計ライン数から連続的に計算する。
export function getCurrentStageConfig(state) {
  return state.mode === 'endless' ? getEndlessConfig(state.linesThisRun) : getStageConfig(state.stage);
}

function startStage(state, stageNumber) {
  const config = getStageConfig(stageNumber);
  state.stage = stageNumber;
  state.board = createBoard();
  state.linesInStage = 0;
  state.combo = 0;
  state.isGameOver = false;
  state.stageCleared = false;
  state.piece = createPiece(COLS, config.widthWeights);
}

function startEndlessRun(state) {
  const config = getEndlessConfig(0);
  state.stage = 1;
  state.board = createBoard();
  state.linesInStage = 0;
  state.combo = 0;
  state.isGameOver = false;
  state.stageCleared = false;
  state.piece = createPiece(COLS, config.widthWeights);
}

function startRun(state, mode) {
  state.mode = mode;
  state.linesThisRun = 0;
  state.highScore = mode === 'endless' ? loadEndlessHighScore() : loadHighScore();
  if (mode === 'endless') {
    startEndlessRun(state);
  } else {
    startStage(state, 1);
  }
}

function updateHighScore(state) {
  if (state.score > state.highScore) {
    state.highScore = state.score;
    if (state.mode === 'endless') {
      saveEndlessHighScore(state.highScore);
    } else {
      saveHighScore(state.highScore);
    }
  }
}

export function moveLeft(state) {
  if (state.isGameOver) return;
  state.piece.col = clampCol(state.piece.col - 1, state.piece.maxCol);
}

export function moveRight(state) {
  if (state.isGameOver) return;
  state.piece.col = clampCol(state.piece.col + 1, state.piece.maxCol);
}

export function setPieceColumn(state, col) {
  if (state.isGameOver) return;
  state.piece.col = clampCol(col, state.piece.maxCol);
}

// 決定操作の前半: ピースが乗る列だけを盤面へ挿入し、押し上げまで行う。
// ライン消去は resolveClears に分離し、間に消去エフェクトを挟めるようにする。
export function placePiece(state) {
  if (state.isGameOver) return { fullRows: [], bonusCells: [], gameOver: true, touchedCols: [] };

  if (isTopRowFilled(state.board)) {
    state.isGameOver = true;
    return { fullRows: [], bonusCells: [], gameOver: true, touchedCols: [] };
  }

  const { col, width, color, special } = state.piece;
  insertPieceIntoColumns(state.board, col, width, { color, special });

  state.score += PLACEMENT_SCORE;
  updateHighScore(state);

  const touchedCols = Array.from({ length: width }, (_, i) => col + i);
  const fullRows = findFullRows(state.board);
  const bonusCells = collectBonusCells(state.board, fullRows);
  return { fullRows, bonusCells, gameOver: false, touchedCols };
}

// 決定操作の後半: 揃った行(+特殊ブロックのボーナスマス)を消去し、
// ステージクリア判定を行い、次のピースを準備する(ステージモードのみ)。
export function resolveClears(state, fullRows, bonusCells = []) {
  if (fullRows.length > 0) {
    const baseScore = SCORE_TABLE[fullRows.length] || fullRows.length * 100;
    const comboMultiplier = Math.min(COMBO_MULTIPLIER_MAX, 1 + state.combo * COMBO_MULTIPLIER_STEP);
    const bonusScore = bonusCells.length * BONUS_CELL_SCORE;
    state.score += Math.round(baseScore * comboMultiplier) + bonusScore;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    clearCells(state.board, buildClearMap(fullRows, bonusCells));
    state.linesInStage += fullRows.length;
    state.linesThisRun += fullRows.length;
  } else {
    state.combo = 0;
  }
  updateHighScore(state);

  const config = getCurrentStageConfig(state);

  if (state.mode === 'stage' && state.linesInStage >= config.requiredLines) {
    state.stageCleared = true;
    return { cleared: fullRows.length, gameOver: false, stageCleared: true };
  }

  state.piece = createPiece(COLS, config.widthWeights);

  if (isTopRowFilled(state.board)) {
    state.isGameOver = true;
  }

  return { cleared: fullRows.length, gameOver: state.isGameOver, stageCleared: false };
}

// ステージクリア後、次のステージへ進む(ステージモード専用)。
// 最終ステージのクリア判定は呼び出し側(main.js)が TOTAL_STAGES と比較して行う。
export function advanceStage(state) {
  startStage(state, state.stage + 1);
}

export function resetGame(state, mode = state.mode) {
  state.score = 0;
  state.maxCombo = 0;
  startRun(state, mode);
}
