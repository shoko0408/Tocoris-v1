import { pickSpecial } from './specials.js';

export const WIDTHS = [1, 2, 3, 4];
export const DEFAULT_WIDTH_WEIGHTS = { 1: 1, 2: 1, 3: 1, 4: 1 };

export const COLORS = ['c-red', 'c-blue', 'c-green', 'c-yellow', 'c-purple', 'c-orange', 'c-cyan'];

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

export function createPiece(cols, widthWeights = DEFAULT_WIDTH_WEIGHTS) {
  const width = randomWidth(widthWeights);
  const maxCol = cols - width;
  const col = Math.floor(maxCol / 2);
  return { width, col, maxCol, color: randomColor(), special: pickSpecial() };
}

export function clampCol(col, maxCol) {
  return Math.max(0, Math.min(col, maxCol));
}
