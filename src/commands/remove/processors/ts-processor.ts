import { readFileSync, writeFileSync } from "node:fs";

/**
 * TypeScriptファイルから@ts-expect-errorコメントを削除
 */
export function removeTsExpectErrors(filePath: string): void {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // expect-errorコメントがある行を削除
  const filteredLines = lines.filter((line) => {
    // expect-errorコメント行をスキップ
    const trimmedLine = line.trim();
    return !trimmedLine.startsWith("// @ts-expect-error");
  });

  // 変更があった場合のみファイルを更新
  if (lines.length !== filteredLines.length) {
    writeFileSync(filePath, filteredLines.join("\n"), "utf-8");
    console.log(
      `  Removed ${
        lines.length - filteredLines.length
      } @ts-expect-error comments from ${filePath}`
    );
  }
}
