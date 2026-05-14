/** AST tipada — nós com line/column para erros */

export interface Position {
  line: number;
  column: number;
}

export type ASTNode =
  | Program
  | Block
  | IfStatement
  | EndIfStatement
  | ForStatement
  | ForEachStatement
  | WhileStatement
  | DoStatement
  | SubDeclaration
  | FunctionDeclaration
  | VarDeclaration
  | Assignment
  | SetAssignment
  | CallStatement
  | ExitStatement
  | ExpressionStatement
  | BinaryExpression
  | UnaryExpression
  | MemberExpression
  | IndexExpression
  | CallExpression
  | Identifier
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NothingLiteral
  | NullLiteral
  | EmptyLiteral;

export interface Program {
  type: "Program";
  body: ASTNode[];
  pos: Position;
}

export interface Block {
  type: "Block";
  body: ASTNode[];
  pos: Position;
}

export interface IfStatement {
  type: "IfStatement";
  test: ASTNode;
  consequent: ASTNode;
  alternate?: ASTNode;
  elseifs?: { test: ASTNode; body: ASTNode }[];
  /** `Then` fechou em `%>`; `End If` vem noutro segmento ASP. */
  spanClose?: boolean;
  pos: Position;
}

export interface EndIfStatement {
  type: "EndIfStatement";
  pos: Position;
}

export interface ForStatement {
  type: "ForStatement";
  variable: string;
  from: ASTNode;
  to: ASTNode;
  step?: ASTNode;
  body: ASTNode;
  pos: Position;
}

export interface ForEachStatement {
  type: "ForEachStatement";
  variable: string;
  collection: ASTNode;
  body: ASTNode;
  pos: Position;
}

export interface WhileStatement {
  type: "WhileStatement";
  test: ASTNode;
  body: ASTNode;
  pos: Position;
}

export type DoKind =
  | { loop: "top"; cond?: ASTNode; condKind?: "While" | "Until" }
  | { loop: "bottom"; cond?: ASTNode; condKind?: "While" | "Until" };

export interface DoStatement {
  type: "DoStatement";
  kind: DoKind;
  body: ASTNode;
  pos: Position;
}

export interface SubDeclaration {
  type: "SubDeclaration";
  name: string;
  params: string[];
  body: ASTNode;
  pos: Position;
}

export interface FunctionDeclaration {
  type: "FunctionDeclaration";
  name: string;
  params: string[];
  body: ASTNode;
  pos: Position;
}

export interface VarDeclaration {
  type: "VarDeclaration";
  names: { name: string; upperBound?: number }[];
  pos: Position;
}

export interface Assignment {
  type: "Assignment";
  target: ASTNode;
  value: ASTNode;
  pos: Position;
}

export interface SetAssignment {
  type: "SetAssignment";
  target: ASTNode;
  value: ASTNode;
  pos: Position;
}

export interface CallStatement {
  type: "CallStatement";
  callee: ASTNode;
  args: ASTNode[];
  pos: Position;
}

export interface ExitStatement {
  type: "ExitStatement";
  kind: "For" | "Do" | "Sub" | "Function";
  pos: Position;
}

export interface ExpressionStatement {
  type: "ExpressionStatement";
  expr: ASTNode;
  pos: Position;
}

export interface BinaryExpression {
  type: "BinaryExpression";
  operator: string;
  left: ASTNode;
  right: ASTNode;
  pos: Position;
}

export interface UnaryExpression {
  type: "UnaryExpression";
  operator: string;
  argument: ASTNode;
  pos: Position;
}

export interface MemberExpression {
  type: "MemberExpression";
  object: ASTNode;
  property: string;
  computed: false;
  pos: Position;
}

export interface IndexExpression {
  type: "IndexExpression";
  object: ASTNode;
  index: ASTNode;
  pos: Position;
}

export interface CallExpression {
  type: "CallExpression";
  callee: ASTNode;
  arguments: ASTNode[];
  pos: Position;
}

export interface Identifier {
  type: "Identifier";
  name: string;
  pos: Position;
}

export interface NumberLiteral {
  type: "NumberLiteral";
  value: number;
  pos: Position;
}

export interface StringLiteral {
  type: "StringLiteral";
  value: string;
  pos: Position;
}

export interface BooleanLiteral {
  type: "BooleanLiteral";
  value: boolean;
  pos: Position;
}

export interface NothingLiteral {
  type: "NothingLiteral";
  pos: Position;
}

export interface NullLiteral {
  type: "NullLiteral";
  pos: Position;
}

export interface EmptyLiteral {
  type: "EmptyLiteral";
  pos: Position;
}
