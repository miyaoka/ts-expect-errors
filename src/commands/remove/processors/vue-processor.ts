import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@vue/compiler-sfc';

/**
 * Vueファイルから@vue-expect-errorと@ts-expect-errorコメントを削除
 */
export function removeVueExpectErrors(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const { descriptor } = parse(content, { filename: filePath });
  
  let modifiedContent = content;
  let removeCount = 0;
  
  // template内の@vue-expect-errorコメントを削除
  if (descriptor.template) {
    const templateContent = descriptor.template.content;
    const lines = templateContent.split('\n');
    const processedLines: string[] = [];
    
    for (const line of lines) {
      if (line.includes('@vue-expect-error')) {
        // コメントを削除
        const processed = line.replace(/<!--\s*@vue-expect-error(?:\s+TS\d+)?\s*-->/g, '');
        removeCount++;
        
        // 削除後に空行になった場合はスキップ
        if (processed.trim() === '') {
          continue;
        }
        processedLines.push(processed);
        continue;
      }
      processedLines.push(line);
    }
    
    const newTemplateContent = processedLines.join('\n');
    modifiedContent = modifiedContent.replace(templateContent, newTemplateContent);
  }
  
  // script/scriptSetup内の@ts-expect-errorコメントを削除
  const scripts = [descriptor.script, descriptor.scriptSetup].filter(Boolean);
  for (const script of scripts) {
    if (!script) continue;
    
    const scriptContent = script.content;
    const lines = scriptContent.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('// @ts-expect-error')) {
        removeCount++;
        return false;
      }
      return true;
    });
    
    const newScriptContent = filteredLines.join('\n');
    modifiedContent = modifiedContent.replace(scriptContent, newScriptContent);
  }
  
  // 変更があった場合のみファイルを更新
  if (removeCount > 0) {
    writeFileSync(filePath, modifiedContent, 'utf-8');
    console.log(`  Removed ${removeCount} expect-error comments from ${filePath}`);
  }
}