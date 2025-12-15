import { test, expect, beforeAll } from "bun:test";
import { $ } from "bun";
import { rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  TEST_PROCESSED_DIR,
  runTestWithLogs,
  setupFixture,
  type FixtureOptions,
} from "./test-utils";

// すべてのフィクスチャの定義
const FIXTURES: FixtureOptions[] = [
  { name: "ts-only", useLogFile: true },
  { name: "react-project" },
  { name: "vue-project" },
];

beforeAll(async () => {
  // テスト開始時に一度だけ一時ディレクトリをクリーンアップ
  rmSync(TEST_PROCESSED_DIR, { recursive: true, force: true });

  // 全フィクスチャの依存関係を事前にインストール
  await Promise.all(
    FIXTURES.map((fixture) => setupFixture(`e2e/fixtures/${fixture.name}`))
  );
});

// 各フィクスチャに対してテストを生成
FIXTURES.forEach((fixture) => {
  test(`${fixture.name}: エラーを抑制し、処理後はエラーゼロになることを確認`, async () => {
    await runTestWithLogs(fixture);

    // 処理後のディレクトリに対して型チェックを実行し、エラーが0になることを確認
    const afterDir = resolve(TEST_PROCESSED_DIR, fixture.name);
    const result = await $`bun run typecheck`.cwd(afterDir).nothrow().quiet();

    // 処理後のtsc/vue-tsc出力をファイルに保存
    const tscOutputAfter = result.stdout.toString() || "No errors found";
    writeFileSync(join(afterDir, "tsc-output-after.txt"), tscOutputAfter);

    // エラーがゼロになっていることを確認（exitCode 0 = エラーなし）
    expect(result.exitCode).toBe(0);

    // エラーが残っていたら詳細を表示（デバッグ用）
    if (result.exitCode !== 0) {
      console.error(`${fixture.name}: 処理後もエラーが残っています`);
      console.error(result.stdout.toString());
    }
  });
});
