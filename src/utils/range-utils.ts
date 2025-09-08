/**
 * 範囲情報の型定義
 */
export interface Range {
  start: number;
  end: number;
}

/**
 * 行番号が複数の範囲のいずれかに含まれるかチェック
 */
export function isInRanges(
  line: number,
  ranges: Range[]
): boolean {
  return ranges.some(
    (range) => line >= range.start && line <= range.end
  );
}