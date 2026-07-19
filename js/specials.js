import { ROWS, COLS } from './board.js';

// 特殊ブロックの出現率(ピース単位)。合計が1を超えないように追加していく。
// 将来追加する場合はここにキーを増やすだけでよい(例: bomb: 0.03, ice: 0.03, star: 0.02)
export const SPECIAL_CHANCES = {
  rainbow: 0.05,
};

// 特殊ブロックごとの見た目・効果を定義するレジストリ。
// getBonusCells: そのマスを含むラインが消えたとき、追加で消すマス目(絶対座標)を返す。
export const SPECIAL_EFFECTS = {
  rainbow: {
    cssClass: 'special-rainbow',
    getBonusCells(row, col) {
      const cells = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) cells.push([r, c]);
        }
      }
      return cells;
    },
  },
};

export function pickSpecial() {
  let roll = Math.random();
  for (const key of Object.keys(SPECIAL_CHANCES)) {
    if (roll < SPECIAL_CHANCES[key]) return key;
    roll -= SPECIAL_CHANCES[key];
  }
  return null;
}

export function getSpecialCssClass(specialId) {
  return SPECIAL_EFFECTS[specialId]?.cssClass ?? '';
}

// 消去される行の中から特殊ブロックを探し、追加で消すマス目(重複なし)を集める
export function collectBonusCells(board, fullRows) {
  const seen = new Set();
  const bonusCells = [];
  fullRows.forEach((row) => {
    for (let c = 0; c < COLS; c++) {
      const cell = board[row][c];
      const effect = cell?.special && SPECIAL_EFFECTS[cell.special];
      if (!effect) continue;
      effect.getBonusCells(row, c).forEach(([r, cc]) => {
        const key = `${r},${cc}`;
        if (!seen.has(key)) {
          seen.add(key);
          bonusCells.push([r, cc]);
        }
      });
    }
  });
  return bonusCells;
}
