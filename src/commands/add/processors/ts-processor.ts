import { readFileSync, writeFileSync } from "node:fs";
import type { TsError } from "../core";

/**
 * TypeScript ファイル（.ts）かどうか判定
 * @param filePath ファイルパス
 * @returns .ts ファイルなら true（.tsx は除外）
 */
export function isTsFile(filePath: string): boolean {
  return filePath.endsWith('.ts') && !filePath.endsWith('.d.ts') && !filePath.endsWith('.tsx');
}

/**
 * TypeScript ファイルのエラー抑制コメントを処理
 * 
 * 処理内容：
 * 1. ファイルを読み込み、行単位で分割
 * 2. エラーを行番号でグループ化
 * 3. 後ろの行から処理（行番号のずれを防ぐ）
 * 4. TS2578エラー（不要な@ts-expect-error）は該当行を削除
 * 5. 通常のエラーは@ts-expect-errorコメントを挿入
 * 
 * @param filePath 処理対象のファイルパス
 * @param errors エラー情報の配列
 */
export function processTsExpectErrors(filePath: string, errors: TsError[]): void {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // エラーを行番号でグループ化
  const errorsByLine = new Map<number, TsError[]>();
  for (const error of errors) {
    const existing = errorsByLine.get(error.line) || [];
    existing.push(error);
    errorsByLine.set(error.line, existing);
  }
  
  // 行番号を降順でソート（後ろから処理することで行番号がずれない）
  const sortedLines = Array.from(errorsByLine.keys()).sort((a, b) => b - a);
  
  for (const lineNum of sortedLines) {
    const lineErrors = errorsByLine.get(lineNum);
    if (!lineErrors) continue;
    
    // TS2578エラー（不要な@ts-expect-error）の場合は削除
    if (lineErrors.some(e => e.code === 'TS2578')) {
      // 該当行を削除（0ベースインデックス）
      lines.splice(lineNum - 1, 1);
      continue;
    }
    
    // 通常のエラーの場合は@ts-expect-errorを挿入
    const index = lineNum - 1;
    
    // インデントを検出
    const targetLine = lines[index];
    const indent = targetLine?.match(/^(\s*)/)?.[1] || '';
    
    // 最初のエラーのみを使用
    const firstError = lineErrors[0];
    if (!firstError) continue;
    const comment = `${indent}// @ts-expect-error ${firstError.code}`;
    
    // エラー行の直前（index位置）にコメント行を挿入
    lines.splice(index, 0, comment);
  }
  
  // ファイルを更新
  writeFileSync(filePath, lines.join('\n'));
}