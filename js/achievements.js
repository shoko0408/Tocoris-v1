// 実績の定義一覧。追加したい場合はここに1件足すだけでよい。
// check(snapshot) は累計統計 + 現在のハイスコアを受け取り、達成していれば true を返す。
export const ACHIEVEMENTS = [
  { id: 'first_play', icon: '🎮', name: 'はじめの一歩', desc: 'ゲームを1回プレイする', check: (s) => s.totalPlays >= 1 },
  { id: 'plays_10', icon: '🔥', name: '常連さん', desc: '10回プレイする', check: (s) => s.totalPlays >= 10 },
  { id: 'lines_10', icon: '🧱', name: 'ライン消去見習い', desc: '累計10ライン消去する', check: (s) => s.totalLines >= 10 },
  { id: 'lines_50', icon: '🏗️', name: 'ライン消去職人', desc: '累計50ライン消去する', check: (s) => s.totalLines >= 50 },
  { id: 'lines_100', icon: '🏆', name: 'ライン消去マスター', desc: '累計100ライン消去する', check: (s) => s.totalLines >= 100 },
  { id: 'score_1000', icon: '⭐', name: 'スコアハンター', desc: 'ハイスコア1000点を達成する', check: (s) => s.highScore >= 1000 },
  { id: 'score_5000', icon: '🌟', name: 'スコアキング', desc: 'ハイスコア5000点を達成する', check: (s) => s.highScore >= 5000 },
  { id: 'combo_5', icon: '⚡', name: 'コンボマスター', desc: '5連鎖コンボを達成する', check: (s) => s.bestCombo >= 5 },
  { id: 'rainbow_first', icon: '🌈', name: 'レインボーハンター', desc: 'レインボーブロックを消す', check: (s) => s.rainbowCleared >= 1 },
  { id: 'stage_5', icon: '🚩', name: 'ステージ5到達', desc: 'ステージ5をクリアする', check: (s) => s.maxStageCleared >= 5 },
  { id: 'all_clear', icon: '👑', name: '完全制覇', desc: '全ステージをクリアする', check: (s) => s.maxStageCleared >= 10 },
  { id: 'endless_20', icon: '♾️', name: 'エンドレスチャレンジャー', desc: 'エンドレスモードで1プレイ20ライン消す', check: (s) => s.endlessBestLines >= 20 },
];
