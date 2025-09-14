# ts-expect-errors

TypeScript/Vue.js プロジェクトの型チェック結果を受け取り、検出されたエラー箇所に自動的に `@ts-expect-error` コメントを挿入してエラーを抑制する CLI ツール。

## 概要

- TypeScript コンパイラ（tsc/vue-tsc）の出力を解析
- 各エラー箇所の直前に `@ts-expect-error` コメントを自動挿入
- 既存コードのエラーを一時的に抑制し、段階的な型安全性の改善を支援
- 標準入力またはファイルから型チェック結果を受け取り可能

## 実装

- gunshi を使用した CLI ハンドリング実装
- Bun ランタイムを使用して TypeScript を直接実行（ビルド不要）

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
# 標準入力から型チェック結果を受け取って処理
tsc --noEmit | bun run src/index.ts
vue-tsc --noEmit | bun run src/index.ts

# ファイルから型チェック結果を読み込んで処理
bun run src/index.ts --log-file tsc-output.txt

# 特定のディレクトリを基準にファイルパスを解決
tsc --noEmit | bun run src/index.ts --target ./src
```

### エラー抑制コメントの削除

```sh
# 指定ディレクトリから@ts-expect-errorコメントを削除
bun run src/index.ts remove --target <target-directory>
```

### オプション

#### メインコマンド（エラー抑制コメントの追加）

- `--target` / `-t`: ファイルパス解決の基準ディレクトリ（デフォルト: `.`）
- `--log-file` / `-l`: 型チェック結果のログファイルパス（未指定時は標準入力から読み込み）

#### remove サブコマンド（エラー抑制コメントの削除）

- `--target` / `-t`: 対象ディレクトリまたはファイルパス（デフォルト: `.`）

### 重要な仕様

- 型チェックは外部で実行し、その結果をパイプまたはファイル経由で渡す
- Vue テンプレートでは `@vue-expect-error` を使用
- TSX では要素内で `{/* @ts-expect-error */}` 形式のコメントを使用
- remove コマンドは`.gitignore`の内容を自動的に考慮して除外
