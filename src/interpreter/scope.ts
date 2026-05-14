import type { Variant } from "./variant.js";

export type SymbolKind = "variable" | "function" | "sub";

export interface SymbolEntry {
  kind: SymbolKind;
  value?: Variant;
  /** For Sub/Function: parameter names */
  params?: string[];
  /** AST body reference id — set by interpreter */
  bodyId?: string;
}

export class Scope {
  private readonly symbols = new Map<string, SymbolEntry>();

  constructor(public readonly parent: Scope | null = null) {}

  get(name: string): SymbolEntry | undefined {
    const key = name.toLowerCase();
    const local = this.symbols.get(key);
    if (local) return local;
    return this.parent?.get(name);
  }

  setLocal(name: string, entry: SymbolEntry): void {
    this.symbols.set(name.toLowerCase(), entry);
  }

  hasLocal(name: string): boolean {
    return this.symbols.has(name.toLowerCase());
  }

  assign(name: string, value: Variant): void {
    const key = name.toLowerCase();
    const target = this.resolveScopeForAssign(key);
    const sym = target.symbols.get(key);
    if (sym?.kind === "function" || sym?.kind === "sub") {
      throw new Error(`Identificador '${name}' não pode receber atribuição`);
    }
    if (sym) sym.value = value;
    else target.symbols.set(key, { kind: "variable", value });
  }

  private resolveScopeForAssign(key: string): Scope {
    let s: Scope | null = this;
    while (s) {
      if (s.symbols.has(key)) return s;
      s = s.parent;
    }
    return this;
  }
}
