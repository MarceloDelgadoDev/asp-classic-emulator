#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distCli = join(__dirname, "..", "dist", "cli", "index.js");

if (!existsSync(distCli)) {
  console.error(
    "asp-emulator: execute `npm run build` antes de usar o binário, ou use `npm run dev --`."
  );
  process.exit(1);
}

await import(pathToFileURL(distCli).href);
