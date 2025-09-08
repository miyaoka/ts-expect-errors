import { $ } from "bun";
import {
  readdirSync,
  readFileSync,
  copyFileSync,
  mkdirSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

// CLIで処理されたテストフィクスチャのディレクトリ
export const TEST_PROCESSED_DIR = "test/fixtures-processed";

// ログを記録する共通関数
export async function runTestWithLogs(
  fixtureName: string,
  checkerOption?: string
) {
  const fixtureDir = `test/fixtures/${fixtureName}`;
  const afterDir = join(TEST_PROCESSED_DIR, fixtureName);

  // afterディレクトリを作成してコピー
  copyDirectory(fixtureDir, afterDir);

  // afterディレクトリで依存関係をインストール
  if (existsSync(join(afterDir, "package.json"))) {
    await $`bun install`.cwd(afterDir).quiet();
  }

  // tscを実行してエラーを取得（処理前の状態）
  const checker = checkerOption || "tsc";
  const tscResult = await $`npx ${checker} --noEmit`
    .cwd(afterDir)
    .nothrow()
    .quiet();
  const tscOutput = tscResult.stdout.toString() || "No errors found";
  writeFileSync(join(afterDir, "tsc-output-before.txt"), tscOutput);

  // エラーがあったファイルのパスを抽出
  const errorFiles = new Set<string>();
  const lines = tscOutput.split("\n");
  for (const line of lines) {
    const file = line.match(/^(.+?)\(\d+,\d+\):/)?.[1];
    if (file) {
      errorFiles.add(file);
    }
  }

  // CLIを実行してエラーを抑制
  const args = checkerOption
    ? ["--project", afterDir, `--checker=${checkerOption}`]
    : ["--project", afterDir];
  const cliResult = await $`bun run src/index.ts ${args}`.nothrow().quiet();

  if (cliResult.exitCode !== 0) {
    throw new Error(`CLI failed with exit code ${cliResult.exitCode}`);
  }

  // 処理後のエラーファイルの内容を取得
  const afterFiles: Record<string, string> = {};
  for (const filePath of errorFiles) {
    const fullPath = join(afterDir, filePath);
    if (existsSync(fullPath)) {
      afterFiles[filePath] = readFileSync(fullPath, "utf-8");
    }
  }

  return afterFiles;
}

// ディレクトリを再帰的にコピー（node_modulesは除外）
export function copyDirectory(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    // node_modulesとbun.lockbはコピーしない
    if (entry.name === "node_modules" || entry.name === "bun.lockb") continue;

    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// フィクスチャの依存関係をインストール
export async function setupFixture(fixtureDir: string) {
  if (existsSync(join(fixtureDir, "package.json"))) {
    console.log(`Installing dependencies for ${fixtureDir}...`);
    await $`bun install`.cwd(fixtureDir);
  }
}
