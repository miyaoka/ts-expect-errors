#!/usr/bin/env bun
import { join } from "node:path";
import { createCLI } from "@miyaoka/fsss";

const cli = createCLI({
  name: "ts-expect-errors",
  commandsDir: join(import.meta.dirname, "commands"),
  defaultCommand: "add",
});
await cli.run();
