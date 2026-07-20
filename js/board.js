export const ROWS = 14;
export const COLS = 8;

export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function isTopRowFilled(board) {
  return board[ROWS - 1].some((cell) => cell !== null);
}

// 盤面全体を1段押し上げ、空いた最下段に rowCells(長さCOLSの配列。中身は
// { pieceId, color, special } または null)を差し込む。ブロックの形・位置関係は
// 常に一緒に動くため、あとから分断されることがない。
export function insertRowAtBottom(board, rowCells) {
  for (let r = ROWS - 1; r > 0; r--) {
    board[r] = board[r - 1];
  }
  board[0] = rowCells.map((cell) => (cell ? { ...cell } : null));
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

// 指定したマスに乗っているブロック(出現時の塊)の全体の範囲を求める。
// 同じ行の中で pieceId が連続している範囲を探す。空マスなら null。
export function getPieceAt(board, row, col) {
  const cell = board[row][col];
  if (!cell) return null;
  const { pieceId } = cell;
  let startCol = col;
  while (startCol > 0 && board[row][startCol - 1]?.pieceId === pieceId) startCol -= 1;
  let endCol = col;
  while (endCol < COLS - 1 && board[row][endCol + 1]?.pieceId === pieceId) endCol += 1;
  return { row, startCol, width: endCol - startCol + 1, pieceId };
}

// 指定ブロックが左右にスライドできる範囲(到達できる最小・最大startCol)を求める。
// 壁か、他のブロックにぶつかるところまで。
export function getSlideBounds(board, piece) {
  const { row, startCol, width } = piece;

  let minCol = startCol;
  while (minCol > 0 && board[row][minCol - 1] === null) minCol -= 1;

  let maxCol = startCol;
  while (maxCol + width < COLS && board[row][maxCol + width] === null) maxCol += 1;

  return { minCol, maxCol };
}

// ブロックを newStartCol の位置へ実際にスライドさせる(範囲チェックは呼び出し側で行う前提)。
export function moveBlockTo(board, piece, newStartCol) {
  const { row, startCol, width } = piece;
  if (newStartCol === startCol) return;

  const cells = [];
  for (let c = startCol; c < startCol + width; c++) {
    cells.push(board[row][c]);
    board[row][c] = null;
  }
  for (let i = 0; i < width; i++) {
    board[row][newStartCol + i] = cells[i];
  }
}
