import { writeFileSync } from 'node:fs';
import { parseTsxFile, isInJsxElement } from "../../../tsx-utils";

/**
 * TSXファイルから@ts-expect-errorコメントを削除
 */
export function removeTsxExpectErrors(filePath: string): void {
  // TSXファイルを解析
  const { lines, jsxRanges } = parseTsxFile(filePath);
  
  const processedLines: string[] = [];
  let removeCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const lineNum = i + 1;
    const trimmedLine = line.trim();
    
    // JSX要素内かどうかで処理を分ける
    if (isInJsxElement(lineNum, jsxRanges)) {
      // JSX内のブロックコメント形式のチェック
      if (line.includes('{/* @ts-expect-error')) {
        const processed = line.replace(/\{\/\*\s*@ts-expect-error(?:\s+TS\d+)?\s*\*\/\}/g, '');
        removeCount++;
        
        // 削除後に空行になった場合はスキップ
        if (processed.trim() === '') {
          continue;
        }
        processedLines.push(processed);
        continue;
      }
      processedLines.push(line);
      continue;
    }
    
    // 通常のTypeScript部分
    if (trimmedLine.startsWith('// @ts-expect-error')) {
      removeCount++;
      continue; // この行を削除
    }
    processedLines.push(line);
  }
  
  const modifiedContent = processedLines.join('\n');
  
  // 変更があった場合のみファイルを更新
  if (removeCount > 0) {
    writeFileSync(filePath, modifiedContent, 'utf-8');
    console.log(`  Removed ${removeCount} @ts-expect-error comments from ${filePath}`);
  }
}