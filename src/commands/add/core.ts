import { $ } from "bun";
import { resolve } from "node:path";
import { processTsExpectErrors } from "./processors/ts-processor";
import { processTsxExpectErrors } from "./processors/tsx-processor";
import { processVueExpectErrors } from "./processors/vue-processor";
import { isVueFile, isTsxFile } from "../../utils";

// TypeScriptエラー情報の型
interface TsError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

// TypeScriptエラー出力をパース
function parseTscOutput(output: string): TsError[] {
  const errors: TsError[] = [];
  const lines = output.trim().split('\n');
  
  for (const lineText of lines) {
    // TSCエラーフォーマット: file(line,column): error TS####: message
    const match = lineText.match(/^(?<file>.+?)\((?<line>\d+),(?<column>\d+)\): error (?<code>TS\d+): (?<message>.+)$/);
    const groups = match?.groups;
    if (!groups) continue;
    
    const { file, line, column, code, message } = groups as {
      file: string;
      line: string;
      column: string;
      code: string;
      message: string;
    };
    errors.push({
      file,
      line: parseInt(line, 10),
      column: parseInt(column, 10),
      code,
      message,
    });
  }
  
  return errors;
}


// メインの処理関数
export async function processTypeScriptErrors(options: {
  project: string;
  checker: string;
}): Promise<void> {
  const { project, checker } = options;
  const projectPath = resolve(project);
  
  console.log(`Running ${checker} in ${projectPath}...`);
  
  // tscを実行してエラーを取得
  const result = await $`npx ${checker} --noEmit`.cwd(projectPath).nothrow().quiet();
  
  if (result.exitCode === 0) {
    console.log('No TypeScript errors found.');
    return;
  }
  
  // エラー出力をパース
  const errors = parseTscOutput(result.stdout.toString());
  
  console.log(`Found ${errors.length} errors`);
  
  // ファイルごとにエラーをグループ化
  const errorsByFile = new Map<string, TsError[]>();
  for (const error of errors) {
    const filePath = resolve(projectPath, error.file);
    const existing = errorsByFile.get(filePath) || [];
    existing.push(error);
    errorsByFile.set(filePath, existing);
  }
  
  // 各ファイルにコメントを挿入
  for (const [filePath, fileErrors] of errorsByFile) {
    console.log(`Processing ${filePath}...`);
    
    // ファイルタイプに応じて適切なプロセッサを選択
    if (isVueFile(filePath)) {
      // Vue ファイルの場合
      processVueExpectErrors(filePath, fileErrors);
      continue;
    }
    
    if (isTsxFile(filePath)) {
      // TSX ファイルの場合
      processTsxExpectErrors(filePath, fileErrors);
      continue;
    }
    
    // 通常の TypeScript ファイル（.ts, .js など）
    processTsExpectErrors(filePath, fileErrors);
  }
  
  console.log('Done!');
}