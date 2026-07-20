// ステージごとの設定を数式で生成する: 必要ライン数 / 1手あたりの制限時間(速度) / ピース幅の出現比率(難易度)。
// ステージが進むほど、必要ライン数が増え、制限時間が短くなり、幅の狭いブロックが増えていく。
const TOTAL_STAGE_COUNT = 30;

function buildStage(stageNumber) {
  const n = stageNumber - 1; // 0始まりにして計算しやすくする
  const requiredLines = 3 + Math.floor(n * 1.3);
  const turnTimeSec = Math.max(4, 10 - n * 0.25);
  const widthWeights = {
    1: Math.min(5, 1 + Math.floor(n / 3)),
    2: 3,
    3: Math.max(1, 4 - Math.floor(n / 6)),
    4: Math.max(1, 5 - Math.floor(n / 3)),
  };
  return { requiredLines, turnTimeSec, widthWeights };
}

export const STAGES = Array.from({ length: TOTAL_STAGE_COUNT }, (_, i) => buildStage(i + 1));

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
