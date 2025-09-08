import type { SFCDescriptor } from '@vue/compiler-sfc';

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

/**
 * SFCDescriptorから各セクションの範囲を取得
 */
export function getVueSectionRanges(descriptor: SFCDescriptor): {
  templateRanges: Range[];
  scriptRanges: Range[];
} {
  const scriptRanges: Range[] = [
    descriptor.scriptSetup?.loc,
    descriptor.script?.loc,
  ]
    .filter((loc) => loc != null)
    .map((loc) => ({ start: loc.start.line, end: loc.end.line }));
  
  const templateRanges: Range[] = descriptor.template?.loc
    ? [
        {
          start: descriptor.template.loc.start.line,
          end: descriptor.template.loc.end.line,
        },
      ]
    : [];
  
  return { templateRanges, scriptRanges };
}