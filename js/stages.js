// ステージごとの設定: 必要ライン数 / 1手あたりの制限時間(速度) / ピース幅の出現比率(難易度)
export const STAGES = [
  { requiredLines: 3, turnTimeSec: 10.0, widthWeights: { 1: 1, 2: 2, 3: 3, 4: 4 } },
  { requiredLines: 4, turnTimeSec: 9.0, widthWeights: { 1: 1, 2: 2, 3: 3, 4: 3 } },
  { requiredLines: 5, turnTimeSec: 8.5, widthWeights: { 1: 2, 2: 2, 3: 3, 4: 3 } },
  { requiredLines: 5, turnTimeSec: 8.0, widthWeights: { 1: 2, 2: 3, 3: 3, 4: 2 } },
  { requiredLines: 6, turnTimeSec: 7.5, widthWeights: { 1: 2, 2: 3, 3: 2, 4: 2 } },
  { requiredLines: 6, turnTimeSec: 7.0, widthWeights: { 1: 3, 2: 3, 3: 2, 4: 2 } },
  { requiredLines: 7, turnTimeSec: 6.5, widthWeights: { 1: 3, 2: 3, 3: 2, 4: 1 } },
  { requiredLines: 7, turnTimeSec: 6.0, widthWeights: { 1: 3, 2: 2, 3: 2, 4: 1 } },
  { requiredLines: 8, turnTimeSec: 5.5, widthWeights: { 1: 4, 2: 2, 3: 2, 4: 1 } },
  { requiredLines: 9, turnTimeSec: 5.0, widthWeights: { 1: 4, 2: 3, 3: 2, 4: 1 } },
];

export const TOTAL_STAGES = STAGES.length;

export function getStageConfig(stageNumber) {
  return STAGES[stageNumber - 1];
}

// エンドレスモード用: 累計ライン数に応じて難易度を連続的に上げていく
// (ステージ表のような固定テーブルではなく、無限に続く想定の計算式)
export function getEndlessConfig(linesThisRun) {
  const level = Math.floor(linesThisRun / 5) + 1;
  const turnTimeSec = Math.max(3, 10 - (level - 1) * 0.4);
  const widthWeights = {
    1: Math.min(5, 1 + Math.floor(level / 2)),
    2: 3,
    3: 3,
    4: Math.max(1, 4 - Math.floor(level / 3)),
  };
  return { requiredLines: Infinity, turnTimeSec, widthWeights, level };
}
