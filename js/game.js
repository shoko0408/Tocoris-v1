import {
  COLS,
  createBoard,
  isTopRowFilled,
  insertRowAtBottom,
  compactBoard,
  findFullRows,
  buildClearMap,
  clearCells,
  getPieceAt,
  getSlideBounds,
  moveBlockTo,
} from './board.js';
import { createPendingSpawn } from './piece.js';
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
    pendingSpawn: null,
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

// ブロック群(セグメント配列)から、盤面1行分のセル配列を組み立てる
function buildRowFromSpawn(spawn) {
  const row = Array(COLS).fill(null);
  spawn.forEach(({
    col, width, color, special, pieceId,
  }) => {
    for (let i = 0; i < width; i++) {
      row[col + i] = { pieceId, color, special };
    }
  });
  return row;
}

// 開始直後は盤面が空でスライドできるブロックが無く詰んでしまうため、
// 最初の1行はスコアやアニメーションなしでそのまま盤面へ置いておく。
function seedInitialRow(state, config) {
  const spawn = createPendingSpawn(COLS, config.widthWeights);
  insertRowAtBottom(state.board, buildRowFromSpawn(spawn));
}

function startStage(state, stageNumber) {
  const config = getStageConfig(stageNumber);
  state.stage = stageNumber;
  state.board = createBoard();
  state.linesInStage = 0;
  state.combo = 0;
  state.isGameOver = false;
  state.stageCleared = false;
  seedInitialRow(state, config);
  state.pendingSpawn = createPendingSpawn(COLS, config.widthWeights);
}

function startEndlessRun(state) {
  const config = getEndlessConfig(0);
  state.stage = 1;
  state.board = createBoard();
  state.linesInStage = 0;
  state.combo = 0;
  state.isGameOver = false;
  state.stageCleared = false;
  seedInitialRow(state, config);
  state.pendingSpawn = createPendingSpawn(COLS, config.widthWeights);
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

// 指定マスに乗っているブロックの情報を返す(空なら null)。
export function pieceAt(state, row, col) {
  return getPieceAt(state.board, row, col);
}

// そのブロックが左右にスライドできる範囲(到達可能な startCol の最小・最大)を返す。
export function slideBounds(state, piece) {
  return getSlideBounds(state.board, piece);
}

// 盤面上の既存ブロックをスライドさせる。実際に位置が変わったら true を返す。
export function slideBlock(state, piece, newStartCol) {
  const { minCol, maxCol } = getSlideBounds(state.board, piece);
  const clamped = Math.max(minCol, Math.min(newStartCol, maxCol));
  if (clamped === piece.startCol) return false;
  moveBlockTo(state.board, piece, clamped);
  return true;
}

// スライドによって既存ブロック同士が下の行の空きにぴったり収まるようになったら、
// そのまま同じ行へ合体させる。揃った行があればその情報を返す(消去はまだしない)。
export function settleAfterSlide(state) {
  compactBoard(state.board);
  const fullRows = findFullRows(state.board);
  const bonusCells = collectBonusCells(state.board, fullRows);
  return { fullRows, bonusCells };
}

// ターンの前半: 予告されていたブロック群を最下段へ挿入する。
// 最下段の列が既存ブロックと重ならなければそのまま同じ行に詰め合い、
// 重なる場合だけ、ぶつかったブロックを(形を保ったまま)押し上げる。
// ライン消去は resolveClears に分離し、間に消去エフェクトを挟めるようにする。
export function spawnPendingBlocks(state) {
  if (state.isGameOver) return { fullRows: [], bonusCells: [], gameOver: true, newCols: [] };

  if (isTopRowFilled(state.board)) {
    state.isGameOver = true;
    return { fullRows: [], bonusCells: [], gameOver: true, newCols: [] };
  }

  const row = buildRowFromSpawn(state.pendingSpawn);
  const newCols = [];
  row.forEach((cell, c) => {
    if (cell) newCols.push(c);
  });
  insertRowAtBottom(state.board, row);
  compactBoard(state.board);

  state.score += PLACEMENT_SCORE;
  updateHighScore(state);

  const fullRows = findFullRows(state.board);
  const bonusCells = collectBonusCells(state.board, fullRows);
  return {
    fullRows, bonusCells, gameOver: false, newCols,
  };
}

// 揃った行(+特殊ブロックのボーナスマス)を実際に消去し、スコア・コンボを加算する。
function applyLineClear(state, fullRows, bonusCells) {
  if (fullRows.length > 0) {
    const baseScore = SCORE_TABLE[fullRows.length] || fullRows.length * 100;
    const comboMultiplier = Math.min(COMBO_MULTIPLIER_MAX, 1 + state.combo * COMBO_MULTIPLIER_STEP);
    const bonusScore = bonusCells.length * BONUS_CELL_SCORE;
    state.score += Math.round(baseScore * comboMultiplier) + bonusScore;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    clearCells(state.board, buildClearMap(fullRows, bonusCells));
    // 消去後、行同士の重なりが解消されて新たに合体できることがあるため再度詰める
    compactBoard(state.board);
    state.linesInStage += fullRows.length;
    state.linesThisRun += fullRows.length;
  } else {
    state.combo = 0;
  }
  updateHighScore(state);
}

// スライドによる合体で揃った行を消去する(次のブロック群の準備はまだしない)。
// ステージクリア判定はここで行い、クリアしていればそれ以上ターンを進めない。
export function resolveSlideClear(state, fullRows, bonusCells = []) {
  applyLineClear(state, fullRows, bonusCells);

  const config = getCurrentStageConfig(state);
  if (state.mode === 'stage' && state.linesInStage >= config.requiredLines) {
    state.stageCleared = true;
    return { stageCleared: true };
  }
  return { stageCleared: false };
}

// ターンの後半: 揃った行(+特殊ブロックのボーナスマス)を消去し、
// ステージクリア判定を行い、次に予告するブロック群を準備する(ステージモードのみ)。
export function resolveClears(state, fullRows, bonusCells = []) {
  applyLineClear(state, fullRows, bonusCells);

  const config = getCurrentStageConfig(state);

  if (state.mode === 'stage' && state.linesInStage >= config.requiredLines) {
    state.stageCleared = true;
    return { cleared: fullRows.length, gameOver: false, stageCleared: true };
  }

  state.pendingSpawn = createPendingSpawn(COLS, config.widthWeights);

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
