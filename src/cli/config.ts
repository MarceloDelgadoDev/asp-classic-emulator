import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LogLevel } from "../utils/logger.js";
import type { ErrorMode } from "../interpreter/error-handler.js";

export interface EmulatorConfigFile {
  port?: number;
  root?: string;
  mode?: ErrorMode;
  strict?: boolean;
  watch?: boolean;
  timeout?: number;
  logLevel?: LogLevel;
}

export interface ResolvedEmulatorConfig {
  port: number;
  root: string;
  mode: ErrorMode;
  strict: boolean;
  watch: boolean;
  timeout: number;
  logLevel: LogLevel;
  configPath: string | null;
}

function parseArg(argv: string[], name: string): string | undefined {
  const p = `--${name}=`;
  const hit = argv.find((a) => a.startsWith(p));
  return hit ? hit.slice(p.length) : undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}

export function loadConfig(argv: string[]): ResolvedEmulatorConfig {
  let file: EmulatorConfigFile = {};
  let loadedPath: string | null = null;
  const configPathArg = parseArg(argv, "config");
  const defaultPath = resolve(process.cwd(), "asp-classic-emulator.config.json");
  const tryPath = configPathArg ? resolve(configPathArg) : defaultPath;
  try {
    const raw = readFileSync(tryPath, "utf8");
    file = JSON.parse(raw) as EmulatorConfigFile;
    loadedPath = tryPath;
  } catch {
    /* sem arquivo de config */
  }

  const port = parseInt(parseArg(argv, "port") ?? String(file.port ?? 3000), 10);
  const root = parseArg(argv, "root") ?? file.root ?? ".";
  const mode = (parseArg(argv, "mode") ?? file.mode ?? "dev") as ErrorMode;
  const strict = hasFlag(argv, "strict") || file.strict === true;
  const watchArg = parseArg(argv, "watch");
  const watch =
    watchArg !== undefined ? watchArg !== "false" : file.watch !== undefined ? Boolean(file.watch) : mode === "dev";
  const timeout = parseInt(parseArg(argv, "timeout") ?? String(file.timeout ?? 90), 10);
  const logLevel = (parseArg(argv, "log-level") ?? file.logLevel ?? "info") as LogLevel;

  return {
    port: Number.isFinite(port) ? port : 3000,
    root: resolve(root),
    mode: mode === "prod" ? "prod" : "dev",
    strict,
    watch,
    timeout: Number.isFinite(timeout) ? timeout : 90,
    logLevel,
    configPath: loadedPath,
  };
}
