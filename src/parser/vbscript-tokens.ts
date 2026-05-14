import { createToken, Lexer } from "chevrotain";

/** Ordem: mais específico / mais longo primeiro (evita `For` comer `Function`). */

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /[ \t\u000B\f]+/,
  group: Lexer.SKIPPED,
});

export const NewLine = createToken({
  name: "NewLine",
  pattern: /\r?\n|\r/,
  line_breaks: true,
});

export const ApostropheComment = createToken({
  name: "ApostropheComment",
  pattern: /'[^\n\r]*/,
  group: Lexer.SKIPPED,
});

export const RemComment = createToken({
  name: "RemComment",
  pattern: /REM\b[^\n\r]*/i,
  group: Lexer.SKIPPED,
});

export const PreserveKw = createToken({ name: "PreserveKw", pattern: /Preserve\b/i });
export const FunctionKw = createToken({ name: "FunctionKw", pattern: /Function\b/i });
export const ElseIfKw = createToken({ name: "ElseIfKw", pattern: /ElseIf\b/i });
export const SelectKw = createToken({ name: "SelectKw", pattern: /Select\b/i });
export const ResumeKw = createToken({ name: "ResumeKw", pattern: /Resume\b/i });
export const NothingKw = createToken({ name: "NothingKw", pattern: /Nothing\b/i });
export const ByValKw = createToken({ name: "ByValKw", pattern: /ByVal\b/i });
export const ByRefKw = createToken({ name: "ByRefKw", pattern: /ByRef\b/i });
export const WhileKw = createToken({ name: "WhileKw", pattern: /While\b/i });
export const WendKw = createToken({ name: "WendKw", pattern: /Wend\b/i });
export const UntilKw = createToken({ name: "UntilKw", pattern: /Until\b/i });
export const ErrorKw = createToken({ name: "ErrorKw", pattern: /Error\b/i });
export const ClassKw = createToken({ name: "ClassKw", pattern: /Class\b/i });
export const EmptyKw = createToken({ name: "EmptyKw", pattern: /Empty\b/i });
export const FalseKw = createToken({ name: "FalseKw", pattern: /False\b/i });
export const CallKw = createToken({ name: "CallKw", pattern: /Call\b/i });
export const CaseKw = createToken({ name: "CaseKw", pattern: /Case\b/i });
export const EachKw = createToken({ name: "EachKw", pattern: /Each\b/i });
export const ElseKw = createToken({ name: "ElseKw", pattern: /Else\b/i });
export const ExitKw = createToken({ name: "ExitKw", pattern: /Exit\b/i });
export const LoopKw = createToken({ name: "LoopKw", pattern: /Loop\b/i });
export const StepKw = createToken({ name: "StepKw", pattern: /Step\b/i });
export const ToKw = createToken({ name: "ToKw", pattern: /To\b/i });
export const ThenKw = createToken({ name: "ThenKw", pattern: /Then\b/i });
export const TrueKw = createToken({ name: "TrueKw", pattern: /True\b/i });
export const WithKw = createToken({ name: "WithKw", pattern: /With\b/i });
export const NullKw = createToken({ name: "NullKw", pattern: /Null\b/i });
export const AndKw = createToken({ name: "AndKw", pattern: /And\b/i });
export const DimKw = createToken({ name: "DimKw", pattern: /Dim\b/i });
export const EndKw = createToken({ name: "EndKw", pattern: /End\b/i });
export const ForKw = createToken({ name: "ForKw", pattern: /For\b/i });
export const ModKw = createToken({ name: "ModKw", pattern: /Mod\b/i });
export const NewKw = createToken({ name: "NewKw", pattern: /New\b/i });
export const NotKw = createToken({ name: "NotKw", pattern: /Not\b/i });
export const SetKw = createToken({ name: "SetKw", pattern: /Set\b/i });
export const SubKw = createToken({ name: "SubKw", pattern: /Sub\b/i });
export const NextKw = createToken({ name: "NextKw", pattern: /Next\b/i });
export const DoKw = createToken({ name: "DoKw", pattern: /Do\b/i });
export const IsKw = createToken({ name: "IsKw", pattern: /Is\b/i });
export const AsKw = createToken({ name: "AsKw", pattern: /As\b/i });
export const IfKw = createToken({ name: "IfKw", pattern: /If\b/i });
export const InKw = createToken({ name: "InKw", pattern: /In\b/i });
export const OrKw = createToken({ name: "OrKw", pattern: /Or\b/i });
export const OnKw = createToken({ name: "OnKw", pattern: /On\b/i });
export const ReDimKw = createToken({ name: "ReDimKw", pattern: /ReDim\b/i });

export const HexLiteral = createToken({
  name: "HexLiteral",
  pattern: /&H[0-9A-F]+/i,
});

export const FloatLiteral = createToken({
  name: "FloatLiteral",
  pattern: /\d+\.\d*(?:E[+-]?\d+)?|\d*\.?\d+E[+-]?\d+/i,
});

export const IntegerLiteral = createToken({
  name: "IntegerLiteral",
  pattern: /\d+/,
});

export const DateLiteral = createToken({
  name: "DateLiteral",
  pattern: /#(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})#/i,
});

export const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: /"(?:[^"]|"")*"/,
});

export const Lte = createToken({ name: "Lte", pattern: /<=/ });
export const Gte = createToken({ name: "Gte", pattern: />=/ });
export const Neq = createToken({ name: "Neq", pattern: /<>/ });
/** `&H` deve vencer `&` sozinho */
export const ConcatOp = createToken({
  name: "ConcatOp",
  pattern: /&(?!H[0-9A-F])/i,
});
export const Eq = createToken({ name: "Eq", pattern: /=/ });
export const Lt = createToken({ name: "Lt", pattern: /</ });
export const Gt = createToken({ name: "Gt", pattern: />/ });

export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const Dot = createToken({ name: "Dot", pattern: /\./ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

export const Plus = createToken({ name: "Plus", pattern: /\+/ });
export const Minus = createToken({ name: "Minus", pattern: /-/ });
export const Star = createToken({ name: "Star", pattern: /\*/ });
export const Slash = createToken({ name: "Slash", pattern: /\// });
export const Backslash = createToken({ name: "Backslash", pattern: /\\/ });
export const Pow = createToken({ name: "Pow", pattern: /\^/ });

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});

export const allTokens = [
  WhiteSpace,
  NewLine,
  ApostropheComment,
  RemComment,
  PreserveKw,
  FunctionKw,
  ElseIfKw,
  SelectKw,
  ResumeKw,
  NothingKw,
  ByValKw,
  ByRefKw,
  WhileKw,
  WendKw,
  UntilKw,
  ErrorKw,
  ClassKw,
  EmptyKw,
  FalseKw,
  CallKw,
  CaseKw,
  EachKw,
  ElseKw,
  ExitKw,
  LoopKw,
  StepKw,
  ToKw,
  ThenKw,
  TrueKw,
  WithKw,
  NullKw,
  AndKw,
  DimKw,
  EndKw,
  ForKw,
  ModKw,
  NewKw,
  NotKw,
  SetKw,
  SubKw,
  NextKw,
  DoKw,
  IsKw,
  AsKw,
  IfKw,
  InKw,
  OrKw,
  OnKw,
  ReDimKw,
  HexLiteral,
  FloatLiteral,
  IntegerLiteral,
  DateLiteral,
  StringLiteral,
  Lte,
  Gte,
  Neq,
  ConcatOp,
  Eq,
  Lt,
  Gt,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Comma,
  Dot,
  Colon,
  Plus,
  Minus,
  Star,
  Slash,
  Backslash,
  Pow,
  Identifier,
];

export const VbScriptLexer = new Lexer(allTokens, { positionTracking: "full" });
