import { writeFileSync } from "node:fs";
import { parseTsxFile, isInJsxElement } from "../../../tsx-utils";

// TypeScriptエラー情報の型
interface TsError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

// TSXファイルのエラー抑制コメントを処理
export function processTsxExpectErrors(
  filePath: string,
  errors: TsError[]
): void {
  // TSXファイルを解析
  const { lines, jsxRanges } = parseTsxFile(filePath);

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
    if (lineErrors.some((e) => e.code === "TS2578")) {
      // 該当行を削除（0ベースインデックス）
      lines.splice(lineNum - 1, 1);
      continue;
    }

    // 通常のエラーの場合は@ts-expect-errorを挿入
    const index = lineNum - 1;

    // インデントを検出
    const targetLine = lines[index];
    const indent = targetLine?.match(/^(\s*)/)?.[1] || "";

    // 最初のエラーのみを使用
    const firstError = lineErrors[0];
    if (!firstError) continue;

    // エラー行がJSX範囲内かチェック
    const isInJsx = isInJsxElement(lineNum, jsxRanges);

    const comment = isInJsx
      ? `${indent}{/* @ts-expect-error ${firstError.code} */}`
      : `${indent}// @ts-expect-error ${firstError.code}`;

    // エラー行の直前（index位置）にコメント行を挿入
    lines.splice(index, 0, comment);
  }

  // ファイルを更新
  writeFileSync(filePath, lines.join("\n"));
}
