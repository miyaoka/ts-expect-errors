# 概要

プロジェクト概要は @README.md を参照し、本ファイルでは開発上の注意や進捗を管理すること

## vue の AST 仕様

- @docs/vue-ast-structure.md

## TypeScript のバージョン構成

TS7 はネイティブポートでプログラマティック API を持たない（7.1 で提供予定）。`src/utils/tsx-utils.ts` が `ts.createSourceFile` で TSX を解析するため、API 側は TS6 から動かせない。よって package.json は公式が示す共存レイアウトを取る。

- `typescript` → `npm:@typescript/typescript6`（API 用。`import * as ts from "typescript"` の解決先。CLI は `tsc6`）
- `@typescript/native` → `npm:typescript@7`（`tsc` コマンドを提供。`pnpm run typecheck` はこちら）

fixture 側の割り当ても同じ制約から決まる。

- `ts-only` / `react-project`: TS7。tsc7 のエラー出力に対するツールの動作を e2e で検証する
- `vue-project`: TS6 固定。vue-tsc（Volar）が TS API 依存のため TS7 では動かない。vue-tsc の peer は `typescript: >=5.0.0` と緩く、明示 pin がないと lock 更新で 7 系に流れて壊れる

## ⚠️ 重要事項

### ツールとライブラリに関する前提

- **ツールはバグがない。最新である。嘘をつかない**
- **期待する挙動と違う場合は、自分が 100%妄想を抱いている。自分が悪い**
- ライブラリやツールの仕様を正しく理解せずに「バグだ」と判断することは禁止

## ⚠️ その他の重要事項

### テスト実行に関する注意

- **e2e/fixtures-processed の手動クリーンアップは不要**
- テストの beforeAll で自動的にクリーンアップされる
- 手動で rm するのは無駄な作業

**src/index.ts は絶対に実行禁止。どのようなパス、どのような方法でも実行してはならない。**

このツール（src/index.ts）は実行されたディレクトリの TypeScript ファイルを直接書き換える破壊的ツールである。テストフィクスチャやプロジェクトファイルを破壊するため、いかなる形式での実行も禁止。

**テストの確認は `bun run test` のみを使用すること。**

- 引数は絶対につけない

**テスト実行時に vue-tsc や tsc の結果はログファイルに出力される。**

- `e2e/fixtures-processed/<fixture-name>/tsc-output-before.txt` - 処理前の tsc/vue-tsc エラー
- `e2e/fixtures-processed/<fixture-name>/tsc-output-after.txt` - 処理後の tsc/vue-tsc エラー
- 個別に vue-tsc や tsc を実行する必要はない。テストログをよく確認すること。

**エラー行のノードは全探索する**

- loc 範囲チェックで早期 return しない
- COMPOUND_EXPRESSION や TEXT_CALL の子要素は loc 範囲外でも探索が必要
