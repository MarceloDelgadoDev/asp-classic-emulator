import { describe, expect, it } from "vitest";
import { splitAspSegments, runAspSource } from "../src/server/asp-runtime.js";
import { createRequestObject } from "../src/objects/request.js";
import { Logger } from "../src/utils/logger.js";

describe("splitAspSegments", () => {
  it("separa HTML e blocos", () => {
    const s = splitAspSegments("a<% Dim x %>b<%= 1 %>c");
    expect(s.map((x) => x.kind)).toEqual(["html", "code", "html", "expr", "html"]);
  });

  it("ignora diretiva <%@ ... %>", () => {
    const s = splitAspSegments('<%@LANGUAGE="VBSCRIPT"%><% x = 1 %>');
    expect(s.map((x) => x.kind)).toEqual(["code"]);
    expect(s[0]!.text).toContain("x = 1");
  });
});

describe("runAspSource", () => {
  it("executa hello basico", () => {
    const src = '<% Dim n : n = 5 %><p><%= n + 1 %></p>';
    const req = createRequestObject(new URLSearchParams(), new URLSearchParams());
    const out = runAspSource({
      filePath: "/test.asp",
      source: src,
      strict: false,
      mode: "dev",
      logger: new Logger("silent"),
      request: req,
    });
    expect(out.status).toBe(200);
    expect(out.body).toContain("6");
  });

  it("If Then em segmento separado de End If (ASP classico)", () => {
    const src = '<% If True Then %><b>sim</b><% End If %>';
    const req = createRequestObject(new URLSearchParams(), new URLSearchParams());
    const out = runAspSource({
      filePath: "/t.asp",
      source: src,
      strict: false,
      mode: "dev",
      logger: new Logger("silent"),
      request: req,
    });
    expect(out.status).toBe(200);
    expect(out.body).toContain("sim");
  });

  it("suprime HTML no ramo Then falso", () => {
    const src = '<% If False Then %><script>bad()</script><% End If %>ok';
    const req = createRequestObject(new URLSearchParams(), new URLSearchParams());
    const out = runAspSource({
      filePath: "/t.asp",
      source: src,
      strict: false,
      mode: "dev",
      logger: new Logger("silent"),
      request: req,
    });
    expect(out.status).toBe(200);
    expect(out.body).not.toContain("bad");
    expect(out.body).toContain("ok");
  });
});
