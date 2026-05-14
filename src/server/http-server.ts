import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer, type IncomingMessage } from "node:http";
import { URL } from "node:url";
import { Logger, type LogLevel } from "../utils/logger.js";
import { parseFormUrlEncoded, parseQueryFromUrl, readBody } from "./request-parser.js";
import { createRequestObject } from "../objects/request.js";
import { runAspSource } from "./asp-runtime.js";
import type { ErrorMode } from "../interpreter/error-handler.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export interface HttpServerOptions {
  root: string;
  port: number;
  mode: ErrorMode;
  strict: boolean;
  logLevel: LogLevel;
}

export function createHttpServer(opts: HttpServerOptions) {
  const logger = new Logger(opts.logLevel);
  const root = resolve(opts.root);

  const server = createServer(async (req, res) => {
    const t0 = Date.now();
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      let rel = pathname === "/" || pathname === "" ? "index.asp" : pathname.replace(/^\//, "");
      if (rel.endsWith("/")) rel += "index.asp";
      const safePath = normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
      const filePath = join(root, safePath);

      if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        logLine(logger, req, 404, Date.now() - t0);
        return;
      }

      const ext = extname(filePath).toLowerCase();
      if (ext === ".asp" || ext === ".inc") {
        const source = readFileSync(filePath, "utf8");
        const query = parseQueryFromUrl(req.url);
        let form = new URLSearchParams();
        if (req.method === "POST" || req.method === "PUT") {
          const buf = await readBody(req);
          const ct = (req.headers["content-type"] ?? "").toLowerCase();
          if (ct.includes("application/x-www-form-urlencoded")) {
            form = parseFormUrlEncoded(buf);
          }
        }
        const request = createRequestObject(query, form);
        const relFromRoot = filePath.slice(root.length).replace(/\\/g, "/");
        const displayPath = relFromRoot.startsWith("/") ? relFromRoot : `/${relFromRoot}`;
        const out = runAspSource({
          filePath: displayPath || "/",
          physicalPath: filePath,
          rootDir: root,
          source,
          strict: opts.strict,
          mode: opts.mode,
          logger,
          request,
        });
        res.writeHead(out.status, out.headers);
        res.end(out.body);
        logLine(logger, req, out.status, Date.now() - t0);
        return;
      }

      const mime = MIME[ext] ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      createReadStream(filePath).pipe(res);
      logLine(logger, req, 200, Date.now() - t0);
    } catch (e) {
      logger.error(String(e));
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Internal Server Error");
      logLine(logger, req, 500, Date.now() - t0);
    }
  });

  return {
    listen(): Promise<void> {
      return new Promise((resolveFn, reject) => {
        server.listen(opts.port, () => resolveFn());
        server.on("error", reject);
      });
    },
    close(): Promise<void> {
      return new Promise((resolveFn, reject) => {
        server.close((err) => (err ? reject(err) : resolveFn()));
      });
    },
    get logger() {
      return logger;
    },
  };
}

function logLine(logger: Logger, req: IncomingMessage, status: number, ms: number): void {
  const m = req.method ?? "GET";
  const u = req.url ?? "/";
  logger.info(`${m}  ${u}  ${status}  ${ms}ms`);
}
