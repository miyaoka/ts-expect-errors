import { $ } from "bun";
import { resolve } from "node:path";
import { readFile, exists } from "node:fs/promises";
import { processTsExpectErrors } from "./processors/ts-processor";
import { processTsxExpectErrors } from "./processors/tsx-processor";
import { processVueExpectErrors } from "./processors/vue-processor";
import { isVueFile, isTsxFile } from "../../utils/file-types";

// TypeScriptエラー情報の型
export interface TsError {
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

// ログファイルからtsc出力を読み込む
async function readTscOutputFromFile(logFilePath: string): Promise<string | null> {
  const resolvedPath = resolve(logFilePath);
  
  // ログファイルの存在確認
  if (!await exists(resolvedPath)) {
    console.error(`Log file not found: ${resolvedPath}`);
    process.exit(1);
  }
  
  console.log(`Reading log file: ${resolvedPath}...`);
  const content = await readFile(resolvedPath, 'utf-8');
  
  // ログファイルが空の場合
  if (!content.trim()) {
    console.log('Log file is empty. No TypeScript errors to process.');
    return null;
  }
  
  return content;
}

// tscまたはvue-tscを実行してエラーを取得
async function runTypeScriptChecker(projectPath: string, checker: string): Promise<string | null> {
  console.log(`Running ${checker} in ${projectPath}...`);
  
  try {
    console.log(`Executing: npx ${checker} --noEmit in ${projectPath}`);
    const result = await $`npx ${checker} --noEmit`.cwd(projectPath).nothrow();
    
    if (result.exitCode === 0) {
      console.log('No TypeScript errors found.');
      return null;
    }
    
    if (result.exitCode === 127) {
      console.error(`Command not found: ${checker}`);
      console.error('stderr:', result.stderr.toString());
      throw new Error(`${checker} command not found in ${projectPath}`);
    }
    
    return result.stdout.toString();
  } catch (error) {
    console.error(`Error running ${checker}:`, error);
    throw error;
  }
}


// エラーを処理してファイルにコメントを挿入
async function processErrors(errors: TsError[], projectPath: string): Promise<void> {
  
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

// メインの処理関数
export async function processTypeScriptErrors(options: {
  project: string;
  checker: string;
  "log-file"?: string;
}): Promise<void> {
  const { project, checker } = options;
  const projectPath = resolve(project);
  const logFile = options["log-file"];
  
  // ログファイルが指定されている場合は読み込み
  if (logFile) {
    const tscOutput = await readTscOutputFromFile(logFile);
    if (!tscOutput) return; // 空またはエラーの場合は終了
    
    // エラー出力をパース
    const errors = parseTscOutput(tscOutput);
    await processErrors(errors, projectPath);
    return;
  }
  
  // ログファイルが指定されていない場合はtscを実行
  const tscOutput = await runTypeScriptChecker(projectPath, checker);
  if (!tscOutput) return; // エラーがない場合は終了
  
  // エラー出力をパース
  const errors = parseTscOutput(tscOutput);
  await processErrors(errors, projectPath);
}