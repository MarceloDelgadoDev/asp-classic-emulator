<div align="center">

# asp-classic-emulator

**Run ASP Classic on macOS, Linux and BSD.**

No Windows. No IIS. No VM.

```bash
npx asp-classic-emulator
```

[![npm version](https://img.shields.io/npm/v/asp-classic-emulator)](https://www.npmjs.com/package/asp-classic-emulator)
[![npm downloads](https://img.shields.io/npm/dm/asp-classic-emulator)](https://www.npmjs.com/package/asp-classic-emulator)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange)]()
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20BSD-lightgrey)]()

</div>

---

## What is this?

ASP Classic never died — it just got stranded on Windows. Millions of lines of VBScript are still running in production, and maintaining them means either keeping a Windows Server around or setting up a VM every time someone needs to touch the code.

**asp-classic-emulator** fixes that. Drop it into any folder with `.asp` files, run one command, and get a fully working HTTP server that interprets VBScript — on any POSIX system.

```
your-project/
├── index.asp
├── login.asp
└── includes/
    └── conn.asp
```

```bash
cd your-project
npx asp-classic-emulator
# → Serving on http://localhost:3000
```

> **Note:** This project is in active development. See the [Implemented](#implemented-v010) and [Planned](#planned) sections below for an accurate picture of what works today.

---

## Quick start

### Requirements

- Node.js ≥ 18
- macOS, Linux, or BSD

### Run without installing

```bash
npx asp-classic-emulator
```

### Install globally

```bash
npm install -g asp-classic-emulator
asp-classic-emulator
```

### Install as a project dependency

```bash
npm install asp-classic-emulator
```

```typescript
import { createServer } from 'asp-classic-emulator'

const server = createServer({
  root: './www',
  port: 3000,
  mode: 'dev',
})

await server.start()
```

---

## Implemented (v0.1.0)

### HTTP server

- Serves `.asp` files through the VBScript interpreter
- Serves static files (`.css`, `.js`, `.png`, `.jpg`, `.gif`, `.svg`, `.ico`) with correct `Content-Type`
- Parses `QueryString` and `Form` (URL-encoded and multipart)
- Request log: `GET /index.asp 200 11ms`
- Dev error page — file name, line, column, source excerpt, stack trace
- Prod error page — classic IIS-style (`Microsoft VBScript runtime error '800a000d'`)

### VBScript — Phase 1

| Construct | Status |
|---|---|
| `Dim`, `Set` | ✅ |
| Variable assignment | ✅ |
| `If` / `ElseIf` / `Else` / `End If` | ✅ |
| `For` / `Next` | ✅ |
| `For Each` / `Next` | ✅ |
| `While` / `Wend` | ✅ |
| `Do` / `Loop` | ✅ |
| `Sub` / `End Sub` | ✅ |
| `Function` / `End Function` (basic) | ✅ |
| Fixed arrays — `Dim a(10)` | ✅ |
| Expressions (arithmetic, logical, comparison, string `&`) | ✅ |

### ASP objects

| Object | Implemented members |
|---|---|
| `Response` | `Write`, `End`, `Clear`, `ContentType`, `Charset` |
| `Request` | `QueryString("key")`, `Form("key")` |

### Type system

- Full `Variant` type with subtypes: `Empty`, `Null`, `Boolean`, `Integer`, `Long`, `Double`, `String`, `Object`
- Implicit coercion works as in IIS — warning printed to terminal
- `--strict` flag turns coercions into runtime errors

### `#include`

- `<!--#include file="..." -->` and `<!--#include virtual="..." -->`
- Circular reference detection (throws with full cycle path)

### CLI flags (wired)

| Flag | Default | Description |
|---|---|---|
| `--port` | `3000` | Port to listen on |
| `--root` | `.` | Root folder with `.asp` files |
| `--mode` | `dev` | `dev` or `prod` |
| `--strict` | `false` | Throw on implicit type coercions |
| `--log-level` | `info` | `silent` \| `error` \| `warn` \| `info` \| `debug` |
| `--config` | `asp-classic-emulator.config.json` | Path to config file |

### Config file

Create `asp-classic-emulator.config.json` in your project root. CLI flags override config values.

```json
{
  "port": 3000,
  "root": "./www",
  "mode": "dev",
  "strict": false,
  "logLevel": "info"
}
```

---

## Planned

The following features are on the roadmap but **not yet implemented**.

### VBScript — Phase 1 (remaining)

| Construct | Status |
|---|---|
| `ReDim` / dynamic arrays | 🔜 |
| `Exit For`, `Exit Do`, `Exit Sub`, `Exit Function` | 🔜 |
| `Function` return value | 🔜 |

### VBScript — Phase 2

| Construct | Status |
|---|---|
| `Select Case` | 🔜 |
| `On Error Resume Next` / `Err` object | 🔜 |
| `With` / `End With` | 🔜 |
| `Class` / `End Class` | 🔜 |
| `Execute` / `ExecuteGlobal` | 🔜 |
| Full VBScript built-in functions (`Split`, `Replace`, `Mid`, `DateAdd`, ...) | 🔜 |

### ASP objects (remaining)

| Object / member | Status |
|---|---|
| `Response.Redirect`, `Response.Cookies`, `Response.Headers` | 🔜 |
| `Request.Cookies`, `Request.ServerVariables`, `Request.BinaryRead` | 🔜 |
| `Session` (Contents, Abandon, Timeout, SessionID) | 🔜 |
| `Application` (Contents, Lock, Unlock) | 🔜 |
| `Server` (CreateObject, MapPath, URLEncode, HTMLEncode) | 🔜 |

### Database support

| Feature | Status |
|---|---|
| `ADODB.Connection` + `ADODB.Recordset` | 🔜 |
| SQLite (built-in, zero config) | 🔜 |
| MySQL / MariaDB | 🔜 |
| PostgreSQL | 🔜 |

### Other

| Feature | Status |
|---|---|
| `global.asa` (`Application_OnStart`, `Session_OnStart`) | 🔜 |
| `.html` / `.htm` with embedded ASP blocks | 🔜 |
| `#include` cache (invalidated on file change) | 🔜 |
| Watch mode (auto-reload on file change) | 🔜 |
| `--watch` / `--timeout` wired to runtime | 🔜 |
| `--help` flag | 🔜 |
| Config keys: `session`, `databases`, `virtualDirectories` | 🔜 |

---

## Type system

VBScript's `Variant` type is fully emulated. Every variable can hold any subtype and changes at runtime — just like the original.

```vbscript
Dim x
x = 42      ' Long
x = "hello" ' String
x = True    ' Boolean
x = Null    ' Null (contagious in expressions)
x = Empty   ' Empty (zero in numeric context)
```

### Implicit coercion

By default, implicit coercions work exactly as in IIS, and a warning is printed to the terminal:

```
[WARN] Implicit coercion in /dashboard.asp:12 — String "42" → Number
       Use CInt() or CDbl() for explicit conversion. Run with --strict to throw instead.
```

Use `--strict` to turn all implicit coercions into runtime errors:

```bash
asp-classic-emulator --strict
```

---

## Architecture

```
HTTP Request
     │
     ▼
HTTP Server (node:http)
     │
     ▼
Request Parser  ──  QueryString, Form, Headers
     │
     ▼
ASP Pre-processor  ──  resolve #include, split HTML / <% %>
     │
     ▼
Lexer (Chevrotain)  ──  text → typed token stream
     │
     ▼
Parser (Chevrotain)  ──  tokens → AST with line/column info
     │
     ▼
Interpreter  ──  walks AST, injects ASP objects, executes VBScript
     │
     ▼
HTTP Response  ──  flush HTML buffer to client
```

---

## Why a hand-written parser?

No usable VBScript parser exists in the Node.js ecosystem. The few packages that exist are abandoned, incomplete, or cover less than 60% of the grammar.

[Chevrotain](https://chevrotain.io) was chosen because:

- **TypeScript native** — no separate grammar file, no code generation step
- **Incrementally extensible** — adding `Select Case` or `With` is a new method, nothing existing breaks
- **Built-in error recovery** — precise line and column in every error message
- **Production-grade** — used by SAP, MongoDB, and others

---

## Contributing

Contributions are welcome, especially:

- VBScript built-in functions (`Split`, `Join`, `Replace`, `Mid`, `DateAdd`, etc.)
- `ReDim`, `Exit`, and `Function` return value (Phase 1 remaining items)
- Additional `Response` and `Request` members
- Real-world ASP fixture files for the test suite (anonymized is fine)
- Bug reports with `.asp` snippets that don't behave as expected

```bash
git clone https://github.com/MarceloDelgadoDev/asp-classic-emulator
cd asp-classic-emulator
npm install
npm run dev
npm test
```

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built for the developers keeping legacy systems alive.</sub>
</div>