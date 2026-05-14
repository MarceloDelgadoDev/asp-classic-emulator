#!/usr/bin/env node
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { createHttpServer } from "../server/http-server.js";
import { Logger } from "../utils/logger.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cfg = loadConfig(argv);
  const logger = new Logger(cfg.logLevel);

  const server = createHttpServer({
    root: cfg.root,
    port: cfg.port,
    mode: cfg.mode,
    strict: cfg.strict,
    logLevel: cfg.logLevel,
  });

  await server.listen();

  const box = [
    "┌─────────────────────────────────────────┐",
    "│  ASP Emulator v0.1.0                    │",
    `│  Servindo: ${resolve(cfg.root).padEnd(27).slice(0, 27)}│`,
    `│  http://localhost:${String(cfg.port).padEnd(17)}│`,
    `│  Modo: ${cfg.mode.padEnd(10)} · Watch: ${(cfg.watch ? "ativo" : "off").padEnd(8)}│`,
    "└─────────────────────────────────────────┘",
  ].join("\n");
  logger.info(box);

  if (cfg.watch) {
    logger.info("(Watch mode: reinício automático ainda não ligado nesta versão)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
