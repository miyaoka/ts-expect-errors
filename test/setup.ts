#!/usr/bin/env bun
// テストフィクスチャのセットアップスクリプト

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const FIXTURES_DIR = "test/fixtures";

// フィクスチャディレクトリを取得
const fixtures = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(FIXTURES_DIR, d.name));

// 各フィクスチャの依存関係をインストール
for (const fixture of fixtures) {
  if (existsSync(join(fixture, "package.json"))) {
    console.log(`📦 Installing dependencies for ${fixture}...`);
    try {
      await $`bun install`.cwd(fixture);
      console.log(`✅ ${fixture} ready\n`);
    } catch (error) {
      console.error(`❌ Failed to install dependencies for ${fixture}`);
      process.exit(1);
    }
  }
}

console.log("✨ All fixtures ready for testing!");
