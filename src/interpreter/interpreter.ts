import type { ASTNode, Block, Program } from "../parser/ast.js";
import type { CoerceContext } from "./variant.js";
import {
  addVariants,
  concatVariants,
  isNothing,
  toNumber,
  vbNothing,
  type Variant,
} from "./variant.js";
import { Scope } from "./scope.js";
import type { Logger } from "../utils/logger.js";
import type { ResponseObject } from "../objects/response.js";
import type { RequestObject } from "../objects/request.js";

export interface InterpreterOptions {
  sourceFile: string;
  strict: boolean;
  logger: Logger;
  response: ResponseObject;
  request: RequestObject;
}

export class Interpreter {
  private readonly ctx: CoerceContext;
  private scope: Scope;
  private readonly subs = new Map<string, { params: string[]; body: ASTNode }>();
  private readonly funcs = new Map<string, { params: string[]; body: ASTNode }>();
  private returnValue: Variant = undefined;
  private inFunction = false;
  private readonly pendingSpanIf: { suppressHtml: boolean }[] = [];
  private htmlSuppressDepth = 0;

  constructor(opts: InterpreterOptions) {
    this.ctx = {
      strict: opts.strict,
      logger: opts.logger,
      sourceFile: opts.sourceFile,
      line: 1,
      column: 1,
    };
    this.scope = new Scope(null);
    this.scope.setLocal("response", { kind: "variable", value: opts.response as unknown as Variant });
    this.scope.setLocal("request", { kind: "variable", value: opts.request as unknown as Variant });
    this.scope.setLocal("Response", { kind: "variable", value: opts.response as unknown as Variant });
    this.scope.setLocal("Request", { kind: "variable", value: opts.request as unknown as Variant });
  }

  run(program: Program): void {
    this.execBlock(program.body, program.pos.line, program.pos.column);
  }

  /** HTML literal entre `<% %>` — omitir quando ramo `If` falso (ASP clássico). */
  shouldWriteHtml(): boolean {
    return this.htmlSuppressDepth <= 0;
  }

  assertSpanIfClosed(): void {
    if (this.pendingSpanIf.length > 0) {
      throw new Error(`If sem End If correspondente (${this.pendingSpanIf.length} em aberto)`);
    }
  }

  private pos(line: number, col: number): void {
    this.ctx.line = line;
    this.ctx.column = col;
  }

  private execBlock(body: ASTNode[], line: number, col: number): void {
    for (const s of body) {
      this.pos(line, col);
      this.execStatement(s);
    }
  }

  private execStatement(s: ASTNode): void {
    this.pos(s.pos.line, s.pos.column);
    switch (s.type) {
      case "IfStatement":
        this.execIf(s);
        break;
      case "EndIfStatement":
        this.execEndIf(s);
        break;
      case "ForStatement":
        this.execFor(s);
        break;
      case "ForEachStatement":
        this.execForEach(s);
        break;
      case "WhileStatement":
        this.execWhile(s);
        break;
      case "DoStatement":
        this.execDo(s);
        break;
      case "VarDeclaration":
        this.execDim(s);
        break;
      case "ExitStatement":
        throw new Error(`Exit ${s.kind} não suportado neste contexto`);
      case "SubDeclaration":
        this.subs.set(s.name.toLowerCase(), { params: s.params, body: s.body });
        this.scope.setLocal(s.name, { kind: "sub", params: s.params });
        break;
      case "FunctionDeclaration":
        this.funcs.set(s.name.toLowerCase(), { params: s.params, body: s.body });
        this.scope.setLocal(s.name, { kind: "function", params: s.params });
        break;
      case "Assignment":
        this.assign(s.target, this.evalExpr(s.value));
        break;
      case "SetAssignment":
        this.assign(s.target, this.evalExpr(s.value));
        break;
      case "CallStatement":
        this.invokeCallExpr(
          { type: "CallExpression", callee: s.callee, arguments: s.args, pos: s.pos },
          true
        );
        break;
      case "ExpressionStatement":
        this.evalExpr(s.expr);
        break;
      default:
        throw new Error(`Instrução não implementada: ${(s as ASTNode).type}`);
    }
  }

  private execIf(s: import("../parser/ast.js").IfStatement): void {
    const runBlock = (b: ASTNode) => {
      if (b.type === "Block") this.execBlock((b as Block).body, b.pos.line, b.pos.column);
      else this.execStatement(b);
    };
    if (s.spanClose) {
      const ok = this.truthy(this.evalExpr(s.test));
      this.pendingSpanIf.push({ suppressHtml: !ok });
      if (!ok) this.htmlSuppressDepth++;
      runBlock(s.consequent);
      return;
    }
    if (this.truthy(this.evalExpr(s.test))) {
      runBlock(s.consequent);
      return;
    }
    if (s.elseifs) {
      for (const e of s.elseifs) {
        if (this.truthy(this.evalExpr(e.test))) {
          runBlock(e.body);
          return;
        }
      }
    }
    if (s.alternate) runBlock(s.alternate);
  }

  private execEndIf(_s: import("../parser/ast.js").EndIfStatement): void {
    const p = this.pendingSpanIf.pop();
    if (!p) {
      throw new Error("End If sem If correspondente (spanClose)");
    }
    if (p.suppressHtml) this.htmlSuppressDepth--;
  }

  private truthy(v: Variant): boolean {
    if (v === undefined || v === null) return false;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v.length > 0;
    if (typeof v === "boolean") return v;
    return true;
  }

  private execFor(s: import("../parser/ast.js").ForStatement): void {
    const child = new Scope(this.scope);
    const prev = this.scope;
    this.scope = child;
    const from = Math.floor(toNumber(this.evalExpr(s.from), this.ctx));
    const to = Math.floor(toNumber(this.evalExpr(s.to), this.ctx));
    const step = s.step ? Math.floor(toNumber(this.evalExpr(s.step), this.ctx)) : 1;
    for (let i = from; step >= 0 ? i <= to : i >= to; i += step) {
      child.setLocal(s.variable, { kind: "variable", value: i });
      this.execBlock(
        s.body.type === "Block" ? (s.body as Block).body : [s.body],
        s.body.pos.line,
        s.body.pos.column
      );
    }
    this.scope = prev;
  }

  private execForEach(s: import("../parser/ast.js").ForEachStatement): void {
    const coll = this.evalExpr(s.collection);
    const arr = Array.isArray(coll) ? coll : this.tryEnumerable(coll);
    const child = new Scope(this.scope);
    const prev = this.scope;
    this.scope = child;
    for (const item of arr) {
      child.setLocal(s.variable, { kind: "variable", value: item });
      this.execBlock(
        s.body.type === "Block" ? (s.body as Block).body : [s.body],
        s.body.pos.line,
        s.body.pos.column
      );
    }
    this.scope = prev;
  }

  private tryEnumerable(v: Variant): Variant[] {
    if (v !== null && typeof v === "object" && !Array.isArray(v) && "__vbItems" in (v as object)) {
      return (v as unknown as { __vbItems: Variant[] }).__vbItems;
    }
    return [v];
  }

  private execWhile(s: import("../parser/ast.js").WhileStatement): void {
    while (this.truthy(this.evalExpr(s.test))) {
      this.execBlock(
        s.body.type === "Block" ? (s.body as Block).body : [s.body],
        s.body.pos.line,
        s.body.pos.column
      );
    }
  }

  private execDo(s: import("../parser/ast.js").DoStatement): void {
    const body = s.body.type === "Block" ? (s.body as Block).body : [s.body];
    if (s.kind.loop === "top") {
      for (;;) {
        const ok =
          s.kind.condKind === "While"
            ? this.truthy(this.evalExpr(s.kind.cond!))
            : !this.truthy(this.evalExpr(s.kind.cond!));
        if (!ok) break;
        this.execBlock(body, s.body.pos.line, s.body.pos.column);
      }
    } else {
      do {
        this.execBlock(body, s.body.pos.line, s.body.pos.column);
        const ok =
          s.kind.condKind === "While"
            ? this.truthy(this.evalExpr(s.kind.cond!))
            : !this.truthy(this.evalExpr(s.kind.cond!));
        if (!ok) break;
      } while (true);
    }
  }

  private execDim(s: import("../parser/ast.js").VarDeclaration): void {
    for (const d of s.names) {
      if (d.upperBound !== undefined) {
        const a: Variant[] = new Array(d.upperBound + 1).fill(undefined);
        this.scope.setLocal(d.name, { kind: "variable", value: a });
      } else {
        this.scope.setLocal(d.name, { kind: "variable", value: undefined });
      }
    }
  }

  private assign(target: ASTNode, value: Variant): void {
    if (target.type === "Identifier") {
      this.scope.assign(target.name, value);
      return;
    }
    if (target.type === "MemberExpression") {
      const o = this.evalExpr(target.object);
      if (o !== null && typeof o === "object" && !Array.isArray(o) && "__vbSetProp" in (o as object)) {
        (o as unknown as { __vbSetProp: (p: string, v: Variant) => void }).__vbSetProp(target.property, value);
        return;
      }
      (o as Record<string, unknown>)[target.property] = value;
      return;
    }
    if (target.type === "IndexExpression") {
      const o = this.evalExpr(target.object);
      const ix = Math.floor(toNumber(this.evalExpr(target.index), this.ctx));
      if (Array.isArray(o)) o[ix] = value;
      else throw new Error("Destino de atribuição inválido");
      return;
    }
    throw new Error("Destino de atribuição não suportado");
  }

  /** Expressão isolada (`<%= %>`). */
  evaluateExpr(expr: ASTNode): Variant {
    return this.evalExpr(expr);
  }

  private evalExpr(e: ASTNode): Variant {
    this.pos(e.pos.line, e.pos.column);
    switch (e.type) {
      case "NumberLiteral":
        return e.value;
      case "StringLiteral":
        return e.value;
      case "BooleanLiteral":
        return e.value;
      case "NullLiteral":
        return null;
      case "EmptyLiteral":
        return undefined;
      case "NothingLiteral":
        return vbNothing();
      case "Identifier":
        return this.lookup(e.name);
      case "UnaryExpression": {
        const v = this.evalExpr(e.argument);
        if (e.operator === "Not") return !this.truthy(v);
        if (e.operator === "-") return -toNumber(v, this.ctx);
        if (e.operator === "+") return toNumber(v, this.ctx);
        throw new Error(`Operador unário ${e.operator}`);
      }
      case "BinaryExpression":
        return this.evalBinary(e);
      case "MemberExpression":
        return this.getMember(e.object, e.property);
      case "IndexExpression": {
        const o = this.evalExpr(e.object);
        const ix = Math.floor(toNumber(this.evalExpr(e.index), this.ctx));
        if (Array.isArray(o)) return o[ix] ?? undefined;
        throw new Error("Índice inválido");
      }
      case "CallExpression":
        return this.invokeCallExpr(e, false);
      default:
        throw new Error(`Expressão não implementada: ${(e as ASTNode).type}`);
    }
  }

  private evalBinary(e: import("../parser/ast.js").BinaryExpression): Variant {
    const L = () => this.evalExpr(e.left);
    const R = () => this.evalExpr(e.right);
    switch (e.operator) {
      case "&":
        return concatVariants(L(), R());
      case "+":
        return addVariants(L(), R(), this.ctx);
      case "-":
        return toNumber(L(), this.ctx) - toNumber(R(), this.ctx);
      case "*":
        return toNumber(L(), this.ctx) * toNumber(R(), this.ctx);
      case "/":
        return toNumber(L(), this.ctx) / toNumber(R(), this.ctx);
      case "\\":
        return Math.floor(toNumber(L(), this.ctx) / toNumber(R(), this.ctx));
      case "^":
        return toNumber(L(), this.ctx) ** toNumber(R(), this.ctx);
      case "Mod":
        return toNumber(L(), this.ctx) % toNumber(R(), this.ctx);
      case "And":
        return this.truthy(L()) && this.truthy(R());
      case "Or":
        return this.truthy(L()) || this.truthy(R());
      case "=":
        return vbEq(L(), R());
      case "<>":
        return !vbEq(L(), R());
      case "<":
        return toNumber(L(), this.ctx) < toNumber(R(), this.ctx);
      case ">":
        return toNumber(L(), this.ctx) > toNumber(R(), this.ctx);
      case "<=":
        return toNumber(L(), this.ctx) <= toNumber(R(), this.ctx);
      case ">=":
        return toNumber(L(), this.ctx) >= toNumber(R(), this.ctx);
      case "Is":
        return L() === R();
      default:
        throw new Error(`Operador ${e.operator}`);
    }
  }

  private lookup(name: string): Variant {
    const sym = this.scope.get(name);
    if (!sym) throw new Error(`Variável indefinida: ${name}`);
    if (sym.kind === "sub" || sym.kind === "function") {
      throw new Error(`Uso inválido de ${name} em expressão`);
    }
    return sym.value as Variant;
  }

  private getMember(objExpr: ASTNode, prop: string): Variant {
    const o = this.evalExpr(objExpr);
    const pl = prop.toLowerCase();
    if (o === null || o === undefined) throw new Error("Object required");
    if (isNothing(o)) throw new Error("Object required: Nothing");
    if (typeof o === "object" && "__vbGetProp" in (o as object)) {
      return (o as unknown as { __vbGetProp: (p: string) => Variant }).__vbGetProp(pl);
    }
    if (typeof o === "object" && pl in (o as object)) {
      return (o as Record<string, Variant>)[pl] as Variant;
    }
    const rec = o as Record<string, Variant>;
    for (const k of Object.keys(rec)) {
      if (k.toLowerCase() === pl) return rec[k] as Variant;
    }
    throw new Error(`Propriedade não encontrada: ${prop}`);
  }

  private invokeCallExpr(e: import("../parser/ast.js").CallExpression, _isStmt: boolean): Variant {
    if (e.callee.type === "Identifier") {
      const name = e.callee.name.toLowerCase();
      const sub = this.subs.get(name);
      if (sub) {
        this.runCallable(sub.params, sub.body, e.arguments.map((a) => this.evalExpr(a)), false);
        return undefined;
      }
      const fn = this.funcs.get(name);
      if (fn) {
        return this.runCallable(fn.params, fn.body, e.arguments.map((a) => this.evalExpr(a)), true);
      }
      throw new Error(`Sub ou função não encontrada: ${e.callee.name}`);
    }
    if (e.callee.type === "MemberExpression") {
      const recv = this.evalExpr(e.callee);
      const args = e.arguments.map((a) => this.evalExpr(a));
      if (recv !== null && typeof recv === "object" && "__vbCallMethod" in (recv as object)) {
        return (recv as unknown as { __vbCallMethod: (m: string, a: Variant[]) => Variant }).__vbCallMethod(
          "item",
          args
        );
      }
      if (typeof recv === "function") {
        return (recv as (...a: Variant[]) => Variant)(...args);
      }
      if (recv !== null && typeof recv === "object") {
        const fn =
          (recv as Record<string, unknown>)[e.callee.property.toLowerCase()] ??
          (recv as Record<string, unknown>)[e.callee.property];
        if (typeof fn === "function") {
          return (fn as (...a: unknown[]) => unknown).apply(recv, args) as Variant;
        }
      }
      throw new Error(`Chamada inválida em membro`);
    }
    throw new Error("Chamada inválida");
  }

  private runCallable(
    params: string[],
    body: ASTNode,
    argVals: Variant[],
    isFunction: boolean
  ): Variant {
    const child = new Scope(this.scope);
    const prev = this.scope;
    this.scope = child;
    for (let i = 0; i < params.length; i++) {
      child.setLocal(params[i]!, { kind: "variable", value: argVals[i] });
    }
    const prevFn = this.inFunction;
    this.inFunction = isFunction;
    this.returnValue = undefined;
    try {
      const stmts = body.type === "Block" ? (body as Block).body : [body];
      for (const s of stmts) {
        this.execStatement(s);
      }
      return this.returnValue;
    } finally {
      this.inFunction = prevFn;
      this.scope = prev;
    }
  }
}

function vbEq(a: Variant, b: Variant): boolean {
  return a === b;
}
