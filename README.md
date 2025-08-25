# ts-expect-errors

TypeScriptプロジェクトのタイプチェックを実行し、検出されたエラー箇所に自動的に `@ts-expect-error` コメントを挿入してエラーを抑制するCLIツール。

## 概要

- TypeScriptコンパイラを使用してプロジェクト全体のタイプエラーを検出
- 各エラー箇所の直前に `@ts-expect-error` コメントを自動挿入
- 既存コードのエラーを一時的に抑制し、段階的な型安全性の改善を支援

## 実装

- `src/` - gunshiを使用したCLIハンドリング実装
- `src2/` - 参考実装（suppress-ts-errorsのコード）
- Bunランタイムを使用してTypeScriptを直接実行（ビルド不要）

## 開発環境のセットアップ

```sh
# ツールのインストール（mise使用）
mise install
```

```sh
# 依存パッケージのインストール
bun install
```

## 使用方法

### エラー抑制コメントの追加

```sh
# プロジェクトのタイプエラーを検出し、@ts-expect-errorコメントを挿入
bun run src/index.ts --project <project-directory>

# Vue.jsプロジェクトの場合
bun run src/index.ts --project <project-directory> --checker vue-tsc
```

### エラー抑制コメントの削除

```sh
# 指定ディレクトリから@ts-expect-errorコメントを削除
bun run src/index.ts remove --target <target-directory>
```

### オプション

#### メインコマンド（エラー抑制コメントの追加）
- `--project` / `-p`: プロジェクトディレクトリパス（デフォルト: `.`）
- `--checker` / `-c`: タイプチェッカーの選択（`tsc` または `vue-tsc`、デフォルト: `tsc`）

#### removeサブコマンド（エラー抑制コメントの削除）
- `--target` / `-t`: 対象ディレクトリまたはファイルパス（デフォルト: `.`）

### 重要な仕様

- Vueテンプレートでは `@vue-expect-error` を使用
- TSXでは要素内で `{/* @ts-expect-error */}` 形式のコメントを使用
- removeコマンドは`.gitignore`の内容を自動的に考慮して除外
