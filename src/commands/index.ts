import { cli } from "gunshi";
import type { Args, Command } from "gunshi";
import { addCommand } from "./add";
import { removeCommand } from "./remove";
import { name, version } from "../../package.json";

export async function run(): Promise<void> {
  // サブコマンドMapを作成
  const subCommands = new Map<string, Command<Args>>();
  subCommands.set("remove", removeCommand);
  subCommands.set("add", addCommand);

  const mainCommand = addCommand;

  // メインコマンドはaddCommand（デフォルト動作）
  await cli(process.argv.slice(2), mainCommand, {
    name,
    version,
    subCommands,
  });
}
