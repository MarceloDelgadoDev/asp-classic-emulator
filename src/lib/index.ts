import { createHttpServer } from "../server/http-server.js";
import type { LogLevel } from "../utils/logger.js";
import type { ErrorMode } from "../interpreter/error-handler.js";

export interface CreateServerOptions {
  root?: string;
  port?: number;
  mode?: ErrorMode;
  strict?: boolean;
  logLevel?: LogLevel;
}

export async function createServer(opts: CreateServerOptions = {}) {
  const root = opts.root ?? ".";
  const port = opts.port ?? 3000;
  const mode = opts.mode ?? "dev";
  const strict = opts.strict ?? false;
  const logLevel = opts.logLevel ?? "info";
  const srv = createHttpServer({ root, port, mode, strict, logLevel });
  return {
    start: async () => {
      await srv.listen();
    },
    stop: async () => {
      await srv.close();
    },
  };
}

export { splitAspSegments, runAspSource, runAspFile } from "../server/asp-runtime.js";
export {
  expandAspIncludes,
  IncludeCycleError,
  IncludeNotFoundError,
} from "../utils/include-resolver.js";
export { parseVbScriptProgram } from "../parser/rd-parser.js";
export { VbScriptLexer } from "../parser/vbscript-tokens.js";
