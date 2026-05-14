import { readFileSync } from "node:fs";
import {
  expandAspIncludes,
  IncludeCycleError,
  IncludeNotFoundError,
} from "../utils/include-resolver.js";
import { VbScriptLexer } from "../parser/vbscript-tokens.js";
import { parseVbScriptProgram } from "../parser/rd-parser.js";
import { ParseError, parseExpressionOnly } from "../parser/rd-parser.js";
import { Interpreter } from "../interpreter/interpreter.js";
import { createResponseObject } from "../objects/response.js";
import type { RequestObject } from "../objects/request.js";
import type { Logger } from "../utils/logger.js";
import type { ErrorMode } from "../interpreter/error-handler.js";
import { formatDevErrorPage, formatProdAspError } from "../interpreter/error-handler.js";

export interface RunAspFileOptions {
  /** Caminho para mensagens de erro (ex.: `/index.asp`). */
  filePath: string;
  source: string;
  strict: boolean;
  mode: ErrorMode;
  logger: Logger;
  request: RequestObject;
  /** Raiz absoluta do site — necessário para expandir `#include virtual` e validar `file`. */
  rootDir?: string;
  /** Caminho absoluto do `.asp` corrente — necessário para `#include file`. */
  physicalPath?: string;
}

export interface RunAspFileResult {
  status: number;
  body: string;
  headers: Record<string, string>;
}

export function splitAspSegments(source: string): { kind: "html" | "code" | "expr"; text: string }[] {
  const out: { kind: "html" | "code" | "expr"; text: string }[] = [];
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf("<%", i);
    if (open < 0) {
      out.push({ kind: "html", text: source.slice(i) });
      break;
    }
    if (open > i) out.push({ kind: "html", text: source.slice(i, open) });
    const close = source.indexOf("%>", open + 2);
    if (close < 0) {
      out.push({ kind: "html", text: source.slice(open) });
      break;
    }
    const inner = source.slice(open + 2, close);
    const trimmedStart = inner.trimStart();
    /** `<%@ ... %>` — metadados IIS; não é VBScript. */
    if (trimmedStart.startsWith("@")) {
      i = close + 2;
      continue;
    }
    if (inner.startsWith("=")) {
      out.push({ kind: "expr", text: inner.slice(1).trim() });
    } else {
      out.push({ kind: "code", text: inner.trim() });
    }
    i = close + 2;
  }
  return out;
}

export function runAspSource(opts: RunAspFileOptions): RunAspFileResult {
  const response = createResponseObject();
  let source = opts.source;
  if (opts.rootDir && opts.physicalPath) {
    try {
      source = expandAspIncludes(opts.source, opts.rootDir, opts.physicalPath);
    } catch (e) {
      const pos = { file: opts.filePath, line: 1, column: 1 };
      const msg = e instanceof Error ? e.message : String(e);
      if (opts.mode === "dev") {
        return {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
          body: formatDevErrorPage({
            message: msg,
            name: e instanceof IncludeCycleError || e instanceof IncludeNotFoundError ? e.name : "Error",
            pos: { file: pos.file, line: pos.line, column: pos.column },
            stack: e instanceof Error ? e.stack : undefined,
          }),
        };
      }
      return {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: formatProdAspError({ message: msg, pos: { file: pos.file, line: pos.line, column: pos.column } }),
      };
    }
  }
  const segments = splitAspSegments(source);
  const interp = new Interpreter({
    sourceFile: opts.filePath,
    strict: opts.strict,
    logger: opts.logger,
    response,
    request: opts.request,
  });
  try {
    for (const seg of segments) {
      if (seg.kind === "html") {
        if (interp.shouldWriteHtml()) response.Write(seg.text);
        continue;
      }
      if (!seg.text) continue;
      const onlyEndIf = /^\s*end\s+if\s*$/i.test(seg.text.trim());
      if (!interp.shouldWriteHtml() && seg.kind === "expr") continue;
      if (!interp.shouldWriteHtml() && seg.kind === "code" && !onlyEndIf) continue;
      const lex = VbScriptLexer.tokenize(seg.text);
      if (lex.errors.length > 0) {
        throw new Error(lex.errors.map((e) => e.message).join("; "));
      }
      if (seg.kind === "expr") {
        const expr = parseExpressionOnly(lex.tokens);
        const v = interp.evaluateExpr(expr);
        response.Write(v);
      } else {
        const program = parseVbScriptProgram(lex.tokens);
        interp.run(program);
      }
    }
    interp.assertSpanIfClosed();
  } catch (e) {
    const pos = { file: opts.filePath, line: 1, column: 1 };
    if (e instanceof ParseError) {
      pos.line = e.pos.line;
      pos.column = e.pos.column;
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (opts.mode === "dev") {
      return {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: formatDevErrorPage({
          message: msg,
          name: e instanceof Error ? e.name : "Error",
          pos: { file: pos.file, line: pos.line, column: pos.column },
          stack: e instanceof Error ? e.stack : undefined,
        }),
      };
    }
    return {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: formatProdAspError({ message: msg, pos: { file: pos.file, line: pos.line, column: pos.column } }),
    };
  }
  return {
    status: 200,
    headers: response.getHeaders(),
    body: response.getOutput(),
  };
}

export function runAspFile(
  physicalPath: string,
  opts: Omit<RunAspFileOptions, "filePath" | "source" | "physicalPath"> & {
    rootDir?: string;
    /** Se omitido, usa `physicalPath` nas mensagens. */
    filePath?: string;
  }
): RunAspFileResult {
  const source = readFileSync(physicalPath, "utf8");
  return runAspSource({
    ...opts,
    filePath: opts.filePath ?? physicalPath,
    physicalPath,
    rootDir: opts.rootDir,
    source,
  });
}
