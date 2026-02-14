import { defineCommand } from "@miyaoka/fsss";
import { globby } from "globby";
import { resolve } from "node:path";
import { z } from "zod";
import { removeTsExpectErrors } from "./processors/ts-processor";
import { removeTsxExpectErrors } from "./processors/tsx-processor";
import { removeVueExpectErrors } from "./processors/vue-processor";
import { isVueFile, isTsxFile } from "../../utils/file-types";

export default defineCommand({
  description: "Remove @ts-expect-error comments from files",
  args: {
    // 対象ディレクトリまたはファイル
    target: {
      type: z.string(),
      alias: "t",
      description: "Target directory or file path",
      default: ".",
    },
  },
  run: async ({ args }) => {
    const { target } = args;
    const targetPath = resolve(target);

    console.log(`Removing @ts-expect-error comments from ${targetPath}...`);

    // globbyで.gitignoreを自動考慮してファイルを取得
    const files = await globby("**/*.{ts,tsx,vue}", {
      cwd: targetPath,
      gitignore: true, // .gitignoreを自動適用
      absolute: true,
    });

    console.log(`Found ${files.length} files to process`);

    // 各ファイルを処理
    for (const filePath of files) {
      // ファイルタイプに応じて適切なプロセッサを選択
      if (isVueFile(filePath)) {
        removeVueExpectErrors(filePath);
        continue;
      }

      if (isTsxFile(filePath)) {
        removeTsxExpectErrors(filePath);
        continue;
      }

      // 通常のTypeScriptファイル
      removeTsExpectErrors(filePath);
    }

    console.log(`Processed ${files.length} files`);
    console.log("Done!");
  },
});
