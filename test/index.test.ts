import { test, expect, beforeAll } from "bun:test";
import { $ } from "bun";
import { rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  TEST_PROCESSED_DIR,
  runTestWithLogs,
  setupFixture,
} from "./test-utils";

// すべてのフィクスチャの定義
const FIXTURES = [
  { name: "ts-only", checker: "tsc" },
  { name: "vue-project", checker: "vue-tsc" },
  { name: "react-project", checker: "tsc" }, // TSX対応をテスト
] as const;

beforeAll(async () => {
  // テスト開始時に一度だけ一時ディレクトリをクリーンアップ
  rmSync(TEST_PROCESSED_DIR, { recursive: true, force: true });

  // 全フィクスチャの依存関係を事前にインストール
  await Promise.all(
    FIXTURES.map((fixture) => setupFixture(`test/fixtures/${fixture.name}`))
  );
});

// 各フィクスチャに対してテストを生成
FIXTURES.forEach(({ name, checker }) => {
  test(`${name}: ${checker}でエラーを抑制し、処理後はエラーゼロになることを確認`, async () => {
    await runTestWithLogs(name, checker);

    // 処理後のディレクトリに対して型チェックを実行し、エラーが0になることを確認
    const afterDir = resolve(TEST_PROCESSED_DIR, name);
    const result = await $`npx ${checker} --noEmit`
      .cwd(afterDir)
      .nothrow()
      .quiet();

    // 処理後のtsc/vue-tsc出力をファイルに保存
    const tscOutputAfter = result.stdout.toString() || "No errors found";
    writeFileSync(join(afterDir, "tsc-output-after.txt"), tscOutputAfter);

    // エラーがゼロになっていることを確認（exitCode 0 = エラーなし）
    expect(result.exitCode).toBe(0);

    // エラーが残っていたら詳細を表示（デバッグ用）
    if (result.exitCode !== 0) {
      console.error(`${name}: 処理後もエラーが残っています`);
      console.error(result.stdout.toString());
    }
  });
});
