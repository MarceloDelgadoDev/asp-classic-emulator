export type ErrorMode = "dev" | "prod";

export interface SourcePosition {
  file: string;
  line: number;
  column: number;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDevErrorPage(opts: {
  message: string;
  name: string;
  pos: SourcePosition;
  stack?: string;
  source?: string;
  highlightLine?: number;
}): string {
  const { message, name, pos, stack, source, highlightLine } = opts;
  let snippet = "";
  if (source && highlightLine !== undefined) {
    const lines = source.split(/\r?\n/);
    const start = Math.max(0, highlightLine - 3);
    const end = Math.min(lines.length, highlightLine + 2);
    for (let i = start; i < end; i++) {
      const n = i + 1;
      const mark = n === highlightLine ? ">" : " ";
      snippet += `${mark} ${String(n).padStart(4, " ")} | ${escapeHtml(lines[i] ?? "")}\n`;
    }
  }
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ASP Classic Emulator — erro</title>
<style>body{font-family:system-ui,sans-serif;margin:2rem;background:#1a1a2e;color:#eee}pre{background:#0f0f1a;padding:1rem;overflow:auto;border-radius:8px}h1{color:#f88}</style>
</head><body>
<h1>${escapeHtml(name)}</h1>
<p><strong>${escapeHtml(pos.file)}</strong> linha ${pos.line}, coluna ${pos.column}</p>
<p>${escapeHtml(message)}</p>
${snippet ? `<h2>Trecho</h2><pre>${snippet}</pre>` : ""}
${stack ? `<h2>Stack</h2><pre>${escapeHtml(stack)}</pre>` : ""}
</body></html>`;
}

export function formatProdAspError(opts: {
  message: string;
  pos: SourcePosition;
  code?: string;
}): string {
  const code = opts.code ?? "800a000d";
  const line = opts.pos.line;
  const file = opts.pos.file;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Erro de runtime</title></head><body>
Microsoft VBScript runtime error '${escapeHtml(code)}'<br/>
${escapeHtml(opts.message)}<br/>
${escapeHtml(file)}, line ${line}
</body></html>`;
}
