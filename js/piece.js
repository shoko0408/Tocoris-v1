import { pickSpecial } from './specials.js';

export const WIDTHS = [1, 2, 3, 4];
export const DEFAULT_WIDTH_WEIGHTS = { 1: 1, 2: 1, 3: 1, 4: 1 };

export const COLORS = ['c-red', 'c-blue', 'c-green', 'c-yellow', 'c-purple', 'c-orange', 'c-cyan'];

const TOTAL_FILLED_MIN = 2; // 1ターンで埋まる合計マス数の下限
const TOTAL_FILLED_MAX = 7; // 1ターンで埋まる合計マス数の上限(盤面幅8マス中)
const MAX_GAP = 3; // ブロック同士・端との間に空く最大マス数

let pieceIdCounter = 0;
function nextPieceId() {
  pieceIdCounter += 1;
  return pieceIdCounter;
}

// ステージごとの難易度(幅の出現比率)に応じて重み付き抽選する
export function randomWidth(widthWeights = DEFAULT_WIDTH_WEIGHTS) {
  const total = WIDTHS.reduce((sum, w) => sum + (widthWeights[w] ?? 0), 0);
  let r = Math.random() * total;
  for (const w of WIDTHS) {
    r -= widthWeights[w] ?? 0;
    if (r < 0) return w;
  }
  return WIDTHS[WIDTHS.length - 1];
}

export function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// 合計の埋めマス数を、1〜4マスの複数ブロックへランダムに分割する
function splitIntoSegmentWidths(totalFilled, widthWeights) {
  const widths = [];
  let remaining = totalFilled;
  while (remaining > 0) {
    const maxWidth = Math.min(4, remaining);
    const cappedWeights = {};
    for (let w = 1; w <= maxWidth; w++) cappedWeights[w] = widthWeights[w] ?? 1;
    const width = randomWidth(cappedWeights);
    widths.push(width);
    remaining -= width;
  }
  return widths;
}

// slotCount個の隙間(先頭・ブロック間・末尾)へ、合計totalBudgetのマスをランダムに配分する。
// 最後のスロットが端数を吸収するので、合計は必ずtotalBudgetに一致する。
function distributeGaps(slotCount, totalBudget) {
  const gaps = [];
  let remaining = totalBudget;
  for (let i = 0; i < slotCount - 1; i++) {
    const cap = Math.min(MAX_GAP, remaining);
    const gap = cap > 0 ? Math.floor(Math.random() * (cap + 1)) : 0;
    gaps.push(gap);
    remaining -= gap;
  }
  gaps.push(remaining);
  return gaps;
}

// 次にせり出してくるブロック群を生成する。盤面の2〜7マスを、1〜4マス幅の
// 複数ブロックがランダムな間隔(隙間なしもあり)で埋めるように配置する。
// 出現位置はここで確定し、プレイヤーは出現前にこの位置を変えられない
// (出現後は、盤面上のブロックとして左右にスライドできる)。
export function createPendingSpawn(cols, widthWeights = DEFAULT_WIDTH_WEIGHTS) {
  const totalFilled = TOTAL_FILLED_MIN + Math.floor(Math.random() * (TOTAL_FILLED_MAX - TOTAL_FILLED_MIN + 1));
  const widths = splitIntoSegmentWidths(totalFilled, widthWeights);
  const gaps = distributeGaps(widths.length + 1, cols - totalFilled);

  const segments = [];
  let col = gaps[0];
  widths.forEach((width, i) => {
    segments.push({
      col, width, color: randomColor(), special: pickSpecial(), pieceId: nextPieceId(),
    });
    col += width + gaps[i + 1];
  });

  return segments;
}
