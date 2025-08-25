import { define } from "gunshi";
import { processTypeScriptErrors } from "./core";

export const addCommand = define({
  name: "add",
  args: {
    // プロジェクトディレクトリオプション
    project: {
      type: "string",
      short: "p",
      description: "Project directory path",
      default: ".",
    },
    // タイプチェッカー選択オプション
    checker: {
      type: "string",
      short: "c",
      description: "TypeScript checker to use (tsc or vue-tsc)",
      default: "tsc",
    },
  },
  run: async (ctx) => {
    await processTypeScriptErrors(ctx.values);
  },
});
