import type { Logger } from "../utils/logger.js";

export type Variant =
  | undefined // Empty
  | null
  | boolean
  | number
  | string
  | Date
  | Variant[]
  | { __vbObject: true; value: unknown };

export function vbNothing(): Variant {
  return { __vbObject: true, value: null }; // Nothing sentinel
}

export function isNothing(v: Variant): boolean {
  return typeof v === "object" && v !== null && "__vbObject" in v && (v as { __vbObject: boolean }).__vbObject === true;
}

export function isEmpty(v: Variant): boolean {
  return v === undefined;
}

export function isNull(v: Variant): boolean {
  return v === null;
}

/** VBScript VarType approximation */
export function varType(v: Variant): number {
  if (v === undefined) return 0;
  if (v === null) return 1;
  if (typeof v === "boolean") return 11;
  if (typeof v === "number") return 5;
  if (typeof v === "string") return 8;
  if (v instanceof Date) return 7;
  if (Array.isArray(v)) return 8192 + 12; // vbArray + Variant
  if (typeof v === "object" && v !== null && "__vbObject" in v) return 9;
  return 9;
}

export interface CoerceContext {
  strict: boolean;
  logger: Logger;
  sourceFile: string;
  line: number;
  column: number;
}

function warnCoerce(ctx: CoerceContext, msg: string): void {
  const loc = `${ctx.sourceFile}:${ctx.line}`;
  if (ctx.strict) {
    throw new TypeError(`Coerção implícita rejeitada (--strict) em ${loc} — ${msg}`);
  }
  ctx.logger.warn(
    `[WARN] asp-emulator: coerção implícita em ${loc}\n       ${msg}\n       Para lançar erro, use a flag --strict.`
  );
}

function isNumericString(s: string): boolean {
  if (s.trim() === "") return false;
  return !Number.isNaN(Number(s));
}

export function toNumber(v: Variant, ctx: CoerceContext): number {
  if (v === undefined) return 0;
  if (v === null) {
    warnCoerce(ctx, "Null usado em contexto numérico → tratado como 0 em operações simples; em VBScript Null é contagioso em +");
    return 0; // simplified: full VBScript null propagation is complex
  }
  if (isNothing(v)) throw new TypeError("Object required / Nothing em contexto numérico");
  if (typeof v === "boolean") return v ? -1 : 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    if (isNumericString(v)) {
      if (v.trim() !== String(Number(v))) warnCoerce(ctx, `String "${v}" convertida para Number`);
      return Number(v);
    }
    warnCoerce(ctx, `String não numérica "${v}" → 0`);
    return 0;
  }
  if (v instanceof Date) return v.getTime();
  warnCoerce(ctx, `Valor convertido para Number de forma heurística`);
  return Number(v);
}

/** Null-propagating add per PRD partial behaviour */
export function addVariants(a: Variant, b: Variant, ctx: CoerceContext): Variant {
  if (a === null || b === null) return null;
  if (typeof a === "string" || typeof b === "string") {
    const na = toNumber(a, ctx);
    const nb = toNumber(b, ctx);
    return na + nb;
  }
  return toNumber(a, ctx) + toNumber(b, ctx);
}

export function concatVariants(a: Variant, b: Variant): string {
  const sa = toStringConcat(a);
  const sb = toStringConcat(b);
  return sa + sb;
}

function toStringConcat(v: Variant): string {
  if (v === undefined) return "";
  if (v === null) return "Null";
  if (isNothing(v)) return "";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return "[array]";
  return String(v);
}
