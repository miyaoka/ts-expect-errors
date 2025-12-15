# 概要

プロジェクト概要は @README.md を参照し、本ファイルでは開発上の注意や進捗を管理すること

## vue の AST 仕様

- @docs/vue-ast-structure.md

## ⚠️ 重要事項

### ツールとライブラリに関する前提

- **ツールはバグがない。最新である。嘘をつかない**
- **期待する挙動と違う場合は、自分が 100%妄想を抱いている。自分が悪い**
- ライブラリやツールの仕様を正しく理解せずに「バグだ」と判断することは禁止

## ⚠️ その他の重要事項

### テスト実行に関する注意

- **test/fixtures-processed の手動クリーンアップは不要**
- テストの beforeAll で自動的にクリーンアップされる
- 手動で rm するのは無駄な作業

**src/index.ts は絶対に実行禁止。どのようなパス、どのような方法でも実行してはならない。**

このツール（src/index.ts）は実行されたディレクトリの TypeScript ファイルを直接書き換える破壊的ツールである。テストフィクスチャやプロジェクトファイルを破壊するため、いかなる形式での実行も禁止。

**テストの確認は `bun run test` のみを使用すること。**

- 引数は絶対につけない

**テスト実行時に vue-tsc や tsc の結果はログファイルに出力される。**

- `test/fixtures-processed/<fixture-name>/tsc-output-before.txt` - 処理前の tsc/vue-tsc エラー
- `test/fixtures-processed/<fixture-name>/tsc-output-after.txt` - 処理後の tsc/vue-tsc エラー
- 個別に vue-tsc や tsc を実行する必要はない。テストログをよく確認すること。

**エラー行のノードは全探索する**

- loc 範囲チェックで早期 return しない
- COMPOUND_EXPRESSION や TEXT_CALL の子要素は loc 範囲外でも探索が必要
