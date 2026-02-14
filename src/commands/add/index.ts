import { defineCommand } from "@miyaoka/fsss";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { processTypeScriptErrors } from "./core";

// 標準入力からデータを読み込む関数
async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  // stdinがTTYの場合（パイプされていない場合）
  if (process.stdin.isTTY) {
    return "";
  }

  return new Promise((resolve, reject) => {
    process.stdin.on("data", (chunk) => {
      chunks.push(chunk);
    });

    process.stdin.on("end", () => {
      const input = Buffer.concat(chunks).toString("utf-8");
      resolve(input);
    });

    process.stdin.on("error", (err) => {
      reject(err);
    });
  });
}

// ログファイルまたは標準入力から読み込む関数
async function readTscOutput(logFile: string | undefined): Promise<string> {
  // ログファイルが指定されている場合
  if (logFile) {
    const logFilePath = resolve(logFile);
    console.log(`Reading log file: ${logFilePath}...`);
    return await readFile(logFilePath, "utf-8");
  }

  // 標準入力から読み込み
  console.log("Reading from stdin...");
  return await readFromStdin();
}

export default defineCommand({
  description: "Add @ts-expect-error comments to suppress type errors",
  args: {
    // 処理の基準パスオプション
    target: {
      type: z.string(),
      alias: "t",
      description: "Target path for resolving file paths",
      default: ".",
    },
    // tscログファイルオプション
    "log-file": {
      type: z.string().optional(),
      alias: "l",
      description:
        "Path to tsc/vue-tsc log file (reads from stdin if not specified)",
    },
  },
  run: async ({ args }) => {
    const targetPath = resolve(args.target);
    const tscOutput = await readTscOutput(args["log-file"]);

    // 入力が空の場合
    if (!tscOutput.trim()) {
      console.error(
        "Error: No input provided. Please provide a log file or pipe tsc/vue-tsc output."
      );
      console.error("Usage:");
      console.error("  tsc --noEmit | bun run src/index.ts add");
      console.error("  bun run src/index.ts add --log-file tsc-output.txt");
      process.exit(1);
    }

    await processTypeScriptErrors(tscOutput, targetPath);
  },
});
