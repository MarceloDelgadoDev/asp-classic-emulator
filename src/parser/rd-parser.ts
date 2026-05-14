import { EOF, tokenMatcher, type IToken, type TokenType } from "chevrotain";
import type { ASTNode, Position, Program } from "./ast.js";
import {
  AndKw,
  ByRefKw,
  ByValKw,
  CallKw,
  Colon,
  Comma,
  ConcatOp,
  DateLiteral,
  DimKw,
  DoKw,
  Dot,
  EachKw,
  ElseIfKw,
  ElseKw,
  EmptyKw,
  EndKw,
  Eq,
  ExitKw,
  FalseKw,
  FloatLiteral,
  ForKw,
  FunctionKw,
  Gt,
  Gte,
  HexLiteral,
  IfKw,
  InKw,
  IntegerLiteral,
  IsKw,
  LoopKw,
  Lt,
  Lte,
  LParen,
  LBracket,
  Minus,
  ModKw,
  Neq,
  NewLine,
  NextKw,
  NotKw,
  NothingKw,
  NullKw,
  OrKw,
  Plus,
  Pow,
  RParen,
  RBracket,
  SetKw,
  Slash,
  Star,
  StepKw,
  StringLiteral,
  SubKw,
  ThenKw,
  ToKw,
  TrueKw,
  UntilKw,
  WendKw,
  WhileKw,
  Identifier,
  Backslash,
} from "./vbscript-tokens.js";

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly pos: Position
  ) {
    super(message);
    this.name = "ParseError";
  }
}

class Cursor {
  pos = 0;
  constructor(public readonly tokens: IToken[]) {}

  peek(): IToken | undefined {
    return this.tokens[this.pos];
  }

  peekSkipNl(): IToken | undefined {
    let i = this.pos;
    while (i < this.tokens.length) {
      const t = this.tokens[i]!;
      if (tokenMatcher(t, NewLine)) i++;
      else return t;
    }
    return undefined;
  }

  advance(): IToken {
    const t = this.tokens[this.pos++];
    if (!t) throw new Error("Fim inesperado do input");
    return t;
  }

  skipNewlines(): void {
    while (this.peek() && tokenMatcher(this.peek()!, NewLine)) this.advance();
  }

  match(tok: TokenType): boolean {
    const p = this.peek();
    return p !== undefined && tokenMatcher(p, tok);
  }

  matchSkipNl(tok: TokenType): boolean {
    const p = this.peekSkipNl();
    return p !== undefined && tokenMatcher(p, tok);
  }

  expect(tok: TokenType, label?: string): IToken {
    const p = this.peek();
    if (!p || !tokenMatcher(p, tok)) {
      const pos = posFromTok(p);
      throw new ParseError(
        `Esperado ${label ?? tok.name}, obtido ${p ? p.image : "EOF"}`,
        pos
      );
    }
    return this.advance();
  }

  expectSkipNl(tok: TokenType, label?: string): IToken {
    this.skipNewlines();
    return this.expect(tok, label);
  }

  eof(): boolean {
    const p = this.peek();
    return !p || tokenMatcher(p, EOF);
  }
}

function posFromTok(t: IToken | undefined): Position {
  if (!t) return { line: 1, column: 1 };
  return { line: t.startLine ?? 1, column: t.startColumn ?? 1 };
}

function posOf(n: ASTNode): Position {
  return n.pos;
}

function skipNlIdx(tokens: IToken[], i: number): number {
  let j = i;
  while (j < tokens.length && tokenMatcher(tokens[j]!, NewLine)) j++;
  return j;
}

function seqAt(c: Cursor, kinds: TokenType[]): boolean {
  let i = skipNlIdx(c.tokens, c.pos);
  for (const k of kinds) {
    if (i >= c.tokens.length || !tokenMatcher(c.tokens[i]!, k)) return false;
    i = skipNlIdx(c.tokens, i + 1);
  }
  return true;
}

function isEndIfStart(c: Cursor): boolean {
  return seqAt(c, [EndKw, IfKw]);
}

function isNextStart(c: Cursor): boolean {
  let i = skipNlIdx(c.tokens, c.pos);
  return i < c.tokens.length && tokenMatcher(c.tokens[i]!, NextKw);
}

function isWendStart(c: Cursor): boolean {
  let i = skipNlIdx(c.tokens, c.pos);
  return i < c.tokens.length && tokenMatcher(c.tokens[i]!, WendKw);
}

function isLoopStart(c: Cursor): boolean {
  let i = skipNlIdx(c.tokens, c.pos);
  return i < c.tokens.length && tokenMatcher(c.tokens[i]!, LoopKw);
}

function isEndSubStart(c: Cursor): boolean {
  return seqAt(c, [EndKw, SubKw]);
}

function isEndFunctionStart(c: Cursor): boolean {
  return seqAt(c, [EndKw, FunctionKw]);
}

/** Lista de statements até `probe` ou EOF (se `allowEof`). */
function stmtListUntil(
  c: Cursor,
  probe: (cc: Cursor) => boolean,
  allowEof = false
): { body: ASTNode[]; incomplete: boolean } {
  const stmts: ASTNode[] = [];
  while (true) {
    c.skipNewlines();
    if (probe(c)) return { body: stmts, incomplete: false };
    if (c.eof()) {
      if (allowEof) return { body: stmts, incomplete: true };
      throw new ParseError("Fim inesperado dentro de bloco", posFromTok(c.peek()));
    }
    stmts.push(parseStatement(c));
    if (c.match(Colon)) c.advance();
    else c.skipNewlines();
  }
}

export function parseVbScriptProgram(tokens: IToken[]): Program {
  const c = new Cursor(tokens);
  c.skipNewlines();
  const body: ASTNode[] = [];
  while (!c.eof()) {
    body.push(parseStatement(c));
    if (c.match(Colon)) c.advance();
    else c.skipNewlines();
  }
  return { type: "Program", body, pos: { line: 1, column: 1 } };
}

function parseStatement(c: Cursor): ASTNode {
  c.skipNewlines();
  if (isEndIfStart(c)) return parseEndIf(c);
  if (c.match(IfKw)) return parseIf(c);
  if (c.match(ForKw)) return parseFor(c);
  if (c.match(WhileKw)) return parseWhile(c);
  if (c.match(DoKw)) return parseDo(c);
  if (c.match(DimKw)) return parseDim(c);
  if (c.match(ExitKw)) return parseExit(c);
  if (c.match(SubKw)) return parseSub(c);
  if (c.match(FunctionKw)) return parseFunction(c);
  if (c.match(SetKw)) return parseSet(c);
  if (c.match(CallKw)) return parseCallStmt(c);
  if (c.match(Identifier)) return parseAssignOrImplicitCall(c);
  const p = c.peek();
  throw new ParseError(`Instrução inválida: '${p?.image ?? ""}'`, posFromTok(p));
}

function parseEndIf(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(EndKw);
  c.expectSkipNl(IfKw);
  return { type: "EndIfStatement", pos: start };
}

function parseIf(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(IfKw);
  const test = parseExpression(c);
  c.expectSkipNl(ThenKw);
  c.skipNewlines();
  const consRes = stmtListUntil(c, isEndIfStart, true);
  if (consRes.incomplete) {
    return {
      type: "IfStatement",
      test,
      consequent: { type: "Block", body: consRes.body, pos: start },
      spanClose: true,
      pos: start,
    };
  }
  const consBody = consRes.body;
  const elseifs: { test: ASTNode; body: ASTNode }[] = [];
  while (c.peekSkipNl() && tokenMatcher(c.peekSkipNl()!, ElseIfKw)) {
    c.skipNewlines();
    c.expect(ElseIfKw);
    const eTest = parseExpression(c);
    c.expectSkipNl(ThenKw);
    c.skipNewlines();
    const eRes = stmtListUntil(c, isEndIfStart, true);
    if (eRes.incomplete) {
      throw new ParseError(
        "ElseIf com corpo que continua fora de <% %> não suportado nesta versão",
        posFromTok(c.peek())
      );
    }
    elseifs.push({ test: eTest, body: { type: "Block", body: eRes.body, pos: start } });
  }
  let alternate: ASTNode | undefined;
  if (c.peekSkipNl() && tokenMatcher(c.peekSkipNl()!, ElseKw)) {
    c.skipNewlines();
    c.expect(ElseKw);
    c.skipNewlines();
    const elRes = stmtListUntil(c, isEndIfStart, true);
    if (elRes.incomplete) {
      throw new ParseError(
        "Else com corpo que continua fora de <% %> não suportado nesta versão",
        posFromTok(c.peek())
      );
    }
    alternate = { type: "Block", body: elRes.body, pos: start };
  }
  c.expectSkipNl(EndKw);
  c.expectSkipNl(IfKw);
  return {
    type: "IfStatement",
    test,
    consequent: { type: "Block", body: consBody, pos: start },
    elseifs: elseifs.length ? elseifs : undefined,
    alternate,
    pos: start,
  };
}

function parseFor(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(ForKw);
  if (c.match(EachKw)) {
    c.advance();
    const idTok = c.expect(Identifier);
    c.expectSkipNl(InKw);
    const coll = parseExpression(c);
    c.skipNewlines();
    const body = stmtListUntil(c, isNextStart, false).body;
    c.expectSkipNl(NextKw);
    if (c.match(Identifier)) c.advance();
    return {
      type: "ForEachStatement",
      variable: idTok.image,
      collection: coll,
      body: { type: "Block", body, pos: start },
      pos: start,
    };
  }
  const idTok = c.expect(Identifier);
  c.expect(Eq);
  const from = parseExpression(c);
  c.expectSkipNl(ToKw);
  const to = parseExpression(c);
  let step: ASTNode | undefined;
  if (c.matchSkipNl(StepKw)) {
    c.skipNewlines();
    c.expect(StepKw);
    step = parseExpression(c);
  }
  c.skipNewlines();
  const body = stmtListUntil(c, isNextStart, false).body;
  c.expectSkipNl(NextKw);
  if (c.match(Identifier)) c.advance();
  return {
    type: "ForStatement",
    variable: idTok.image,
    from,
    to,
    step,
    body: { type: "Block", body, pos: start },
    pos: start,
  };
}

function parseWhile(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(WhileKw);
  const test = parseExpression(c);
  c.skipNewlines();
  const body = stmtListUntil(c, isWendStart, false).body;
  c.expectSkipNl(WendKw);
  return {
    type: "WhileStatement",
    test,
    body: { type: "Block", body, pos: start },
    pos: start,
  };
}

function parseDo(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(DoKw);
  if (c.matchSkipNl(WhileKw) || c.matchSkipNl(UntilKw)) {
    const condKind = c.matchSkipNl(WhileKw) ? "While" : "Until";
    c.skipNewlines();
    if (condKind === "While") c.expect(WhileKw);
    else c.expect(UntilKw);
    const cond = parseExpression(c);
    c.skipNewlines();
    const body = stmtListUntil(c, isLoopStart, false).body;
    c.expectSkipNl(LoopKw);
    return {
      type: "DoStatement",
      kind: { loop: "top", cond, condKind },
      body: { type: "Block", body, pos: start },
      pos: start,
    };
  }
  c.skipNewlines();
  const body = stmtListUntil(c, isLoopStart, false).body;
  c.expectSkipNl(LoopKw);
  const condKind = c.matchSkipNl(WhileKw) ? "While" : "Until";
  if (c.matchSkipNl(WhileKw)) c.skipNewlines(), c.expect(WhileKw);
  else c.skipNewlines(), c.expect(UntilKw);
  const cond = parseExpression(c);
  return {
    type: "DoStatement",
    kind: { loop: "bottom", cond, condKind },
    body: { type: "Block", body, pos: start },
    pos: start,
  };
}

function parseDim(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(DimKw);
  const names: { name: string; upperBound?: number }[] = [];
  do {
    const id = c.expect(Identifier);
    let upper: number | undefined;
    if (c.match(LParen)) {
      c.advance();
      const n = c.expect(IntegerLiteral);
      upper = Number(n.image);
      c.expect(RParen);
    }
    names.push({ name: id.image, upperBound: upper });
    if (c.match(Comma)) c.advance();
    else break;
  } while (c.match(Identifier));
  return { type: "VarDeclaration", names, pos: start };
}

function parseExit(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(ExitKw);
  let kind: "For" | "Do" | "Sub" | "Function";
  if (c.match(ForKw)) {
    c.advance();
    kind = "For";
  } else if (c.match(DoKw)) {
    c.advance();
    kind = "Do";
  } else if (c.match(SubKw)) {
    c.advance();
    kind = "Sub";
  } else if (c.match(FunctionKw)) {
    c.advance();
    kind = "Function";
  } else throw new ParseError("Exit For/Do/Sub/Function esperado", start);
  return { type: "ExitStatement", kind, pos: start };
}

function parseSub(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(SubKw);
  const name = c.expect(Identifier).image;
  const params: string[] = [];
  if (c.match(LParen)) {
    c.advance();
    if (!c.match(RParen)) {
      do {
        if (c.match(ByValKw) || c.match(ByRefKw)) c.advance();
        params.push(c.expect(Identifier).image);
        if (c.match(Comma)) c.advance();
        else break;
      } while (!c.match(RParen));
    }
    c.expect(RParen);
  }
  c.skipNewlines();
  const body = stmtListUntil(c, isEndSubStart, false).body;
  c.expectSkipNl(EndKw);
  c.expectSkipNl(SubKw);
  return {
    type: "SubDeclaration",
    name,
    params,
    body: { type: "Block", body, pos: start },
    pos: start,
  };
}

function parseFunction(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(FunctionKw);
  const name = c.expect(Identifier).image;
  const params: string[] = [];
  if (c.match(LParen)) {
    c.advance();
    if (!c.match(RParen)) {
      do {
        if (c.match(ByValKw) || c.match(ByRefKw)) c.advance();
        params.push(c.expect(Identifier).image);
        if (c.match(Comma)) c.advance();
        else break;
      } while (!c.match(RParen));
    }
    c.expect(RParen);
  }
  c.skipNewlines();
  const body = stmtListUntil(c, isEndFunctionStart, false).body;
  c.expectSkipNl(EndKw);
  c.expectSkipNl(FunctionKw);
  return {
    type: "FunctionDeclaration",
    name,
    params,
    body: { type: "Block", body, pos: start },
    pos: start,
  };
}

function parseSet(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(SetKw);
  const target = parseLeftHandSide(c);
  c.expect(Eq);
  const value = parseExpression(c);
  return { type: "SetAssignment", target, value, pos: start };
}

function parseCallStmt(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  c.expect(CallKw);
  const callee = parseLeftHandSide(c);
  c.expect(LParen);
  const args: ASTNode[] = [];
  if (!c.match(RParen)) {
    args.push(parseExpression(c));
    while (c.match(Comma)) {
      c.advance();
      args.push(parseExpression(c));
    }
  }
  c.expect(RParen);
  return { type: "CallStatement", callee, args, pos: start };
}

function parseAssignOrImplicitCall(c: Cursor): ASTNode {
  const start = posFromTok(c.peek());
  const target = parseLeftHandSide(c);
  if (c.match(Eq)) {
    c.advance();
    const value = parseExpression(c);
    return { type: "Assignment", target, value, pos: start };
  }
  if (stmtEndsHere(c)) {
    return { type: "ExpressionStatement", expr: lhsToExpr(target), pos: start };
  }
  const args: ASTNode[] = [];
  args.push(parseExpression(c));
  while (c.match(Comma)) {
    c.advance();
    args.push(parseExpression(c));
  }
  return { type: "CallStatement", callee: lhsToExpr(target), args, pos: start };
}

function stmtEndsHere(c: Cursor): boolean {
  const t = c.peekSkipNl();
  if (!t || tokenMatcher(t, NewLine) || tokenMatcher(t, EOF) || tokenMatcher(t, Colon))
    return true;
  if (tokenMatcher(t, ElseKw) || tokenMatcher(t, ElseIfKw) || tokenMatcher(t, EndKw))
    return true;
  return false;
}

function lhsToExpr(lhs: ASTNode): ASTNode {
  return lhs;
}

function parseLeftHandSide(c: Cursor): ASTNode {
  let node: ASTNode = identNode(c.expect(Identifier));
  for (;;) {
    if (c.match(Dot)) {
      c.advance();
      const prop = c.expect(Identifier).image;
      node = { type: "MemberExpression", object: node, property: prop, computed: false, pos: posOf(node) };
      continue;
    }
    if (c.match(LBracket)) {
      c.advance();
      const ix = parseExpression(c);
      c.expect(RBracket);
      node = { type: "IndexExpression", object: node, index: ix, pos: posOf(node) };
      continue;
    }
    if (c.match(LParen)) {
      c.advance();
      const args: ASTNode[] = [];
      if (!c.match(RParen)) {
        args.push(parseExpression(c));
        while (c.match(Comma)) {
          c.advance();
          args.push(parseExpression(c));
        }
      }
      c.expect(RParen);
      node = { type: "CallExpression", callee: node, arguments: args, pos: posOf(node) };
      continue;
    }
    break;
  }
  return node;
}

function identNode(t: IToken): ASTNode {
  return { type: "Identifier", name: t.image, pos: posFromTok(t) };
}

/* -------- expressões (precedência crescente) -------- */

function parseExpression(c: Cursor): ASTNode {
  return parseOr(c);
}

function parseOr(c: Cursor): ASTNode {
  let n = parseAnd(c);
  while (c.match(OrKw)) {
    const p = posOf(n);
    c.advance();
    n = { type: "BinaryExpression", operator: "Or", left: n, right: parseAnd(c), pos: p };
  }
  return n;
}

function parseAnd(c: Cursor): ASTNode {
  let n = parseNot(c);
  while (c.match(AndKw)) {
    const p = posOf(n);
    c.advance();
    n = { type: "BinaryExpression", operator: "And", left: n, right: parseNot(c), pos: p };
  }
  return n;
}

function parseNot(c: Cursor): ASTNode {
  if (c.match(NotKw)) {
    const p = posFromTok(c.peek());
    c.advance();
    return { type: "UnaryExpression", operator: "Not", argument: parseNot(c), pos: p };
  }
  return parseComparison(c);
}

function parseComparison(c: Cursor): ASTNode {
  let n = parseConcat(c);
  const ops: TokenType[] = [Eq, Neq, Lt, Gt, Lte, Gte, IsKw];
  const labels = ["=", "<>", "<", ">", "<=", ">=", "Is"];
  for (;;) {
    let hit = -1;
    for (let i = 0; i < ops.length; i++) {
      if (c.match(ops[i]!)) {
        hit = i;
        break;
      }
    }
    if (hit < 0) break;
    const p = posOf(n);
    c.advance();
    n = {
      type: "BinaryExpression",
      operator: labels[hit]!,
      left: n,
      right: parseConcat(c),
      pos: p,
    };
  }
  return n;
}

function parseConcat(c: Cursor): ASTNode {
  let n = parseAdditive(c);
  while (c.match(ConcatOp)) {
    const p = posOf(n);
    c.advance();
    n = { type: "BinaryExpression", operator: "&", left: n, right: parseAdditive(c), pos: p };
  }
  return n;
}

function parseAdditive(c: Cursor): ASTNode {
  let n = parseMod(c);
  for (;;) {
    if (c.match(Plus)) {
      const p = posOf(n);
      c.advance();
      n = { type: "BinaryExpression", operator: "+", left: n, right: parseMod(c), pos: p };
    } else if (c.match(Minus)) {
      const p = posOf(n);
      c.advance();
      n = { type: "BinaryExpression", operator: "-", left: n, right: parseMod(c), pos: p };
    } else break;
  }
  return n;
}

function parseMod(c: Cursor): ASTNode {
  let n = parseIntDiv(c);
  while (c.match(ModKw)) {
    const p = posOf(n);
    c.advance();
    n = { type: "BinaryExpression", operator: "Mod", left: n, right: parseIntDiv(c), pos: p };
  }
  return n;
}

function parseIntDiv(c: Cursor): ASTNode {
  let n = parseMul(c);
  while (c.match(Backslash)) {
    const p = posOf(n);
    c.advance();
    n = { type: "BinaryExpression", operator: "\\", left: n, right: parseMul(c), pos: p };
  }
  return n;
}

function parseMul(c: Cursor): ASTNode {
  let n = parsePow(c);
  for (;;) {
    if (c.match(Star)) {
      const p = posOf(n);
      c.advance();
      n = { type: "BinaryExpression", operator: "*", left: n, right: parsePow(c), pos: p };
    } else if (c.match(Slash)) {
      const p = posOf(n);
      c.advance();
      n = { type: "BinaryExpression", operator: "/", left: n, right: parsePow(c), pos: p };
    } else break;
  }
  return n;
}

function parsePow(c: Cursor): ASTNode {
  let n = parseUnary(c);
  while (c.match(Pow)) {
    const p = posOf(n);
    c.advance();
    n = { type: "BinaryExpression", operator: "^", left: n, right: parseUnary(c), pos: p };
  }
  return n;
}

function parseUnary(c: Cursor): ASTNode {
  if (c.match(Plus)) {
    const p = posFromTok(c.peek());
    c.advance();
    return { type: "UnaryExpression", operator: "+", argument: parseUnary(c), pos: p };
  }
  if (c.match(Minus)) {
    const p = posFromTok(c.peek());
    c.advance();
    return { type: "UnaryExpression", operator: "-", argument: parseUnary(c), pos: p };
  }
  return parsePostfix(c);
}

function parsePostfix(c: Cursor): ASTNode {
  let n = parsePrimary(c);
  for (;;) {
    if (c.match(Dot)) {
      c.advance();
      const prop = c.expect(Identifier).image;
      let chain: ASTNode = {
        type: "MemberExpression",
        object: n,
        property: prop,
        computed: false,
        pos: posOf(n),
      };
      if (c.match(LParen)) {
        c.advance();
        const args: ASTNode[] = [];
        if (!c.match(RParen)) {
          args.push(parseExpression(c));
          while (c.match(Comma)) {
            c.advance();
            args.push(parseExpression(c));
          }
        }
        c.expect(RParen);
        chain = {
          type: "CallExpression",
          callee: chain,
          arguments: args,
          pos: posOf(n),
        };
      }
      n = chain;
      continue;
    }
    if (c.match(LBracket)) {
      c.advance();
      const ix = parseExpression(c);
      c.expect(RBracket);
      n = { type: "IndexExpression", object: n, index: ix, pos: posOf(n) };
      continue;
    }
    if (c.match(LParen)) {
      c.advance();
      const args: ASTNode[] = [];
      if (!c.match(RParen)) {
        args.push(parseExpression(c));
        while (c.match(Comma)) {
          c.advance();
          args.push(parseExpression(c));
        }
      }
      c.expect(RParen);
      n = { type: "CallExpression", callee: n, arguments: args, pos: posOf(n) };
      continue;
    }
    break;
  }
  return n;
}

function parsePrimary(c: Cursor): ASTNode {
  const t = c.peek();
  if (!t) throw new ParseError("Expressão incompleta", { line: 1, column: 1 });
  if (tokenMatcher(t, HexLiteral)) {
    c.advance();
    return {
      type: "NumberLiteral",
      value: parseInt(t.image.replace(/^&H/i, ""), 16),
      pos: posFromTok(t),
    };
  }
  if (tokenMatcher(t, FloatLiteral)) {
    c.advance();
    return { type: "NumberLiteral", value: Number(t.image), pos: posFromTok(t) };
  }
  if (tokenMatcher(t, IntegerLiteral)) {
    c.advance();
    return { type: "NumberLiteral", value: Number(t.image), pos: posFromTok(t) };
  }
  if (tokenMatcher(t, StringLiteral)) {
    c.advance();
    const raw = t.image.slice(1, -1).replace(/""/g, '"');
    return { type: "StringLiteral", value: raw, pos: posFromTok(t) };
  }
  if (tokenMatcher(t, DateLiteral)) {
    c.advance();
    const inner = t.image.slice(1, -1);
    return { type: "StringLiteral", value: inner, pos: posFromTok(t) };
  }
  if (tokenMatcher(t, TrueKw)) {
    c.advance();
    return { type: "BooleanLiteral", value: true, pos: posFromTok(t) };
  }
  if (tokenMatcher(t, FalseKw)) {
    c.advance();
    return { type: "BooleanLiteral", value: false, pos: posFromTok(t) };
  }
  if (tokenMatcher(t, NullKw)) {
    c.advance();
    return { type: "NullLiteral", pos: posFromTok(t) };
  }
  if (tokenMatcher(t, EmptyKw)) {
    c.advance();
    return { type: "EmptyLiteral", pos: posFromTok(t) };
  }
  if (tokenMatcher(t, NothingKw)) {
    c.advance();
    return { type: "NothingLiteral", pos: posFromTok(t) };
  }
  if (tokenMatcher(t, LParen)) {
    c.advance();
    const e = parseExpression(c);
    c.expect(RParen);
    return e;
  }
  if (tokenMatcher(t, Identifier)) {
    c.advance();
    return { type: "Identifier", name: t.image, pos: posFromTok(t) };
  }
  throw new ParseError(`Token inesperado em expressão: ${t.image}`, posFromTok(t));
}

export function parseExpressionOnly(tokens: IToken[]): ASTNode {
  const c = new Cursor(tokens);
  c.skipNewlines();
  const e = parseExpression(c);
  c.skipNewlines();
  if (!c.eof()) {
    throw new ParseError(
      `Expressão seguida de tokens inesperados: ${c.peek()?.image ?? ""}`,
      posFromTok(c.peek())
    );
  }
  return e;
}
