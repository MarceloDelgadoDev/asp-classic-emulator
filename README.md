<div align="center">

# asp-classic-emulator

**Run ASP Classic on macOS, Linux and BSD.**

No Windows. No IIS. No VM.

```bash
npx asp-classic-emulator
```

![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-alpha-orange)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20BSD-lightgrey)

</div>

---

## What is this?

ASP Classic never died — it just got stranded on Windows. Millions of lines of VBScript are still running in production, and maintaining them means either keeping a Windows Server around or setting up a VM every time someone needs to touch the code.

**asp-classic-emulator** fixes that. Drop it into any folder with `.asp` files, run one command, and get a fully working HTTP server that interprets VBScript with high fidelity to the original IIS behavior — on any POSIX system.

```
your-project/
├── index.asp
├── login.asp
├── includes/
│   └── conn.asp
└── global.asa
```

```bash
cd your-project
npx asp-classic-emulator
# → Serving on http://localhost:3000
```

---

## Features

- **Zero config** — works out of the box with a single command
- **High-fidelity VBScript** — hand-written Chevrotain parser, proper Variant type system, implicit coercion with terminal warnings
- **Full ASP object model** — `Response`, `Request`, `Session`, `Application`, `Server`
- **Database support** — SQLite (built-in, zero config), MySQL/MariaDB, PostgreSQL
- **ADO emulation** — `ADODB.Connection`, `ADODB.Recordset` with classic connection strings
- **`CreateObject` support** — `ADODB.*`, `Scripting.FileSystemObject`, `MSXML2.DOMDocument`
- **`#include`** — `file` and `virtual`, resolved at runtime with cache and circular reference detection
- **`global.asa`** — `Application_OnStart`, `Session_OnStart` events
- **Two error modes** — modern stack trace in dev, classic IIS-style error page in prod
- **Static file serving** — CSS, JS, images served automatically alongside `.asp` files
- **Watch mode** — auto-reloads on file changes in development
- **`--strict` mode** — turns implicit type coercions into hard errors
- **Multiple distribution options** — npx, global install, Node.js API, Docker

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

### Use as a Node.js library

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

### Docker

```bash
docker run -p 3000:3000 -v $(pwd)/www:/app/www ghcr.io/asp-classic-emulator/asp-classic-emulator
```

---

## Usage

```
asp-classic-emulator [options]

Options:
  --port        Port to listen on                  [default: 3000]
  --root        Root folder with .asp files        [default: .]
  --mode        dev or prod                        [default: dev]
  --strict      Throw on implicit type coercions   [default: false]
  --watch       Reload on file changes             [default: true in dev]
  --timeout     Script execution timeout (seconds) [default: 90]
  --log-level   silent | error | warn | info | debug  [default: info]
  --config      Path to config file                [default: asp-classic-emulator.config.json]
  --help        Show help
```

### Config file

Create `asp-classic-emulator.config.json` in your project root. CLI flags override config values.

```json
{
  "port": 3000,
  "root": "./www",
  "mode": "dev",
  "strict": false,
  "watch": true,
  "timeout": 90,
  "session": {
    "timeout": 20
  },
  "databases": {
    "default": "Provider=SQLite;Data Source=./db.sqlite"
  },
  "virtualDirectories": {
    "/includes": "./shared/includes"
  }
}
```

---

## VBScript support

### Phase 1 (current)

| Construct | Status |
|---|---|
| `Dim`, `ReDim`, `Set` | ✅ |
| Variable assignment | ✅ |
| `If` / `ElseIf` / `Else` / `End If` | ✅ |
| `For` / `Next` | ✅ |
| `For Each` / `Next` | ✅ |
| `While` / `Wend` | ✅ |
| `Do` / `Loop` | ✅ |
| `Sub` / `End Sub` | ✅ |
| `Function` / `End Function` | ✅ |
| Fixed and dynamic arrays | ✅ |
| Expressions (arithmetic, logical, comparison, string) | ✅ |
| `Exit For`, `Exit Do`, `Exit Sub`, `Exit Function` | ✅ |

### Phase 2 (planned)

| Construct | Status |
|---|---|
| `Select Case` | 🔜 |
| `On Error Resume Next` / `Err` object | 🔜 |
| `With` / `End With` | 🔜 |
| `Class` / `End Class` | 🔜 |
| `Execute` / `ExecuteGlobal` | 🔜 |
| Full VBScript built-in functions | 🔜 |

---

## Type system

VBScript's `Variant` type is fully emulated. Every variable can hold any subtype and changes at runtime — just like the original.

```vbscript
Dim x
x = 42           ' Long
x = "hello"      ' String
x = True         ' Boolean
x = Null         ' Null (contagious in expressions)
x = Empty        ' Empty (zero in numeric context)
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

## Database support

Connection strings use classic ADO syntax — no changes needed to existing code.

```vbscript
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")

' SQLite
conn.Open "Provider=SQLite;Data Source=" & Server.MapPath("./db.sqlite")

' MySQL
conn.Open "Provider=MySQL;Data Source=localhost;Database=mydb;User Id=root;Password=secret"

' PostgreSQL
conn.Open "Provider=PostgreSQL;Data Source=localhost;Database=mydb;User Id=postgres;Password=secret"

Dim rs
Set rs = conn.Execute("SELECT * FROM users WHERE active = 1")

Do While Not rs.EOF
  Response.Write rs("name") & "<br>"
  rs.MoveNext
Loop

rs.Close
conn.Close
```

---

## Error pages

### Development mode

Clear, modern error page with file name, line number, column, source excerpt, and full interpreter stack trace.

### Production mode (`--mode=prod`)

Classic IIS-style error page — exactly what end users would see on a real Windows server:

```
Microsoft VBScript runtime error '800a000d'
Type mismatch
/pagina.asp, line 42
```

---

## Supported file types

| Extension | Behavior |
|---|---|
| `.asp` | Interpreted — `<% %>` blocks executed |
| `.asa` | `global.asa` events (`Application_OnStart`, etc.) |
| `.inc` | Interpreted when included via `#include` |
| `.html`, `.htm` | Interpreted (supports embedded ASP blocks) |
| `.css`, `.js`, `.png`, `.jpg`, `.gif`, `.svg`, `.ico` | Served as static files |
| Other | Served as `application/octet-stream` |

---

## Terminal output

```
┌─────────────────────────────────────────┐
│  ASP Emulator v0.1.0                    │
│  Serving: ./www                         │
│  http://localhost:3000                  │
│  Mode: development · Watch: on          │
└─────────────────────────────────────────┘

GET  /index.asp        200  11ms
GET  /css/style.css    200   2ms
POST /login.asp        302   6ms
GET  /dashboard.asp    200  28ms
[WARN] implicit coercion in /dashboard.asp:42 — String → Number
GET  /report.asp       500   4ms
[ERROR] /report.asp:17 — Object required: 'rs'
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
Request Parser  ──  QueryString, Form, Cookies, Headers
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
- Additional `CreateObject` implementations
- Real-world ASP fixture files for the test suite (anonymized is fine)
- Bug reports with `.asp` snippets that don't behave like IIS

```bash
git clone https://github.com/your-org/asp-classic-emulator
cd asp-classic-emulator
npm install
npm run dev   # starts the emulator pointing to ./examples/hello-world
npm test
```

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built for the developers keeping legacy systems alive.</sub>
</div>