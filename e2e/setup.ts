#!/usr/bin/env bun
// テストフィクスチャのセットアップスクリプト

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// Renovate のデフォルト ignorePaths (`**/__fixtures__/**`) に乗せ、
// フィクスチャの依存を自動更新対象から外すための命名
const FIXTURES_DIR = "e2e/__fixtures__";

// フィクスチャディレクトリを取得
const fixtures = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(FIXTURES_DIR, d.name));

// 各フィクスチャの依存関係をインストール
for (const fixture of fixtures) {
  if (existsSync(join(fixture, "package.json"))) {
    console.log(`📦 Installing dependencies for ${fixture}...`);
    try {
      // fixtureは外部利用者プロジェクトを模した独立プロジェクト。
      // ルートのpnpm-workspace.yamlに巻き込まれないよう--ignore-workspaceで個別install
      await $`pnpm install --ignore-workspace`.cwd(fixture);
      console.log(`✅ ${fixture} ready\n`);
    } catch (error) {
      console.error(`❌ Failed to install dependencies for ${fixture}`);
      process.exit(1);
    }
  }
}

console.log("✨ All fixtures ready for testing!");
