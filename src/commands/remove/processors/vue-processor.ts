import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@vue/compiler-sfc';
import { isInRanges, getVueSectionRanges } from '../../../utils/range-utils';

/**
 * Vueファイルから@vue-expect-errorと@ts-expect-errorコメントを削除
 */
export function removeVueExpectErrors(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const { descriptor } = parse(content, { filename: filePath });
  
  // ファイル全体を行配列として扱う（addと同じ方式）
  const lines = content.split('\n');
  let removeCount = 0;
  
  // 各セクションの範囲を事前に定義（addと同じ）
  const { templateRanges, scriptRanges } = getVueSectionRanges(descriptor);
  
  // 全行を降順で処理（後ろから処理することで行番号がずれない）
  for (let lineNum = lines.length; lineNum >= 1; lineNum--) {
    const lineIndex = lineNum - 1; // 0ベースのインデックス
    const line = lines[lineIndex];
    
    if (!line) continue;
    
    // template部の処理
    if (isInRanges(lineNum, templateRanges)) {
      if (line.includes('@vue-expect-error')) {
        // インラインコメントを削除
        const processed = line.replace(/<!--\s*@vue-expect-error(?:\s+TS\d+)?\s*-->/g, '');
        
        // 削除後に空白行になる場合は行ごと削除
        if (processed.trim() === '') {
          lines.splice(lineIndex, 1);
          removeCount++;
        } else {
          // そうでなければインラインコメントのみ削除
          lines[lineIndex] = processed;
          removeCount++;
        }
      }
      continue;
    }
    
    // script/scriptSetup部の処理
    if (isInRanges(lineNum, scriptRanges)) {
      if (line.trim().startsWith('// @ts-expect-error')) {
        lines.splice(lineIndex, 1);
        removeCount++;
      }
      continue;
    }
  }
  
  // 変更があった場合のみファイルを更新
  if (removeCount > 0) {
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`  Removed ${removeCount} expect-error comments from ${filePath}`);
  }
}