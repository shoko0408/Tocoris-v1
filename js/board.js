export const ROWS = 14;
export const COLS = 8;

export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function isTopRowFilled(board) {
  return board[ROWS - 1].some((cell) => cell !== null);
}

// ピースが乗る列(startCol 〜 startCol+width-1)だけを1段押し上げ、
// 空いた最下段に cellData({ color, special })を差し込む。触れていない列はそのまま。
export function insertPieceIntoColumns(board, startCol, width, cellData) {
  for (let c = startCol; c < startCol + width; c++) {
    for (let r = ROWS - 1; r > 0; r--) {
      board[r][c] = board[r - 1][c];
    }
    board[0][c] = { ...cellData };
  }
}

export function findFullRows(board) {
  const full = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every((cell) => cell !== null)) full.push(r);
  }
  return full;
}

// 揃った行 + 特殊ブロックのボーナスマスから、列ごとに消す行番号の集合を組み立てる
export function buildClearMap(fullRows, bonusCells = []) {
  const map = new Map();
  const rowsFor = (c) => {
    if (!map.has(c)) map.set(c, new Set());
    return map.get(c);
  };
  fullRows.forEach((r) => {
    for (let c = 0; c < COLS; c++) rowsFor(c).add(r);
  });
  bonusCells.forEach(([r, c]) => rowsFor(c).add(r));
  return map;
}

// colRowsMap(列ごとの消す行番号の集合)に従ってセルを取り除き、
// 各列の残りを詰めて落とす(列ごとの重力)。
export function clearCells(board, colRowsMap) {
  colRowsMap.forEach((rows, c) => {
    if (rows.size === 0) return;
    const kept = [];
    for (let r = 0; r < ROWS; r++) {
      if (!rows.has(r)) kept.push(board[r][c]);
    }
    while (kept.length < ROWS) kept.push(null);
    for (let r = 0; r < ROWS; r++) {
      board[r][c] = kept[r];
    }
  });
}
