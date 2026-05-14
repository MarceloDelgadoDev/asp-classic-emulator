import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { expandAspIncludes, IncludeCycleError, IncludeNotFoundError } from "../src/utils/include-resolver.js";

describe("expandAspIncludes", () => {
  it("expande file= relativo ao ficheiro corrente", () => {
    const dir = mkdtempSync(join(tmpdir(), "asp-inc-"));
    const sub = join(dir, "inc");
    mkdirSync(sub);
    writeFileSync(join(sub, "child.inc"), "<span>OK</span>");
    writeFileSync(
      join(dir, "parent.asp"),
      `<!--#include file="inc/child.inc"-->`
    );
    const out = expandAspIncludes(
      readFileSync(join(dir, "parent.asp"), "utf8"),
      dir,
      join(dir, "parent.asp")
    );
    expect(out).toContain("<span>OK</span>");
    expect(out).not.toContain("#include");
  });

  it("expande virtual= relativo à raiz", () => {
    const dir = mkdtempSync(join(tmpdir(), "asp-inc-"));
    mkdirSync(join(dir, "common"));
    writeFileSync(join(dir, "common", "x.inc"), "VIRTUAL");
    writeFileSync(join(dir, "a.asp"), `<!--#include virtual="/common/x.inc"-->`);
    const out = expandAspIncludes(readFileSync(join(dir, "a.asp"), "utf8"), dir, join(dir, "a.asp"));
    expect(out).toContain("VIRTUAL");
  });

  it("detecta ciclo", () => {
    const dir = mkdtempSync(join(tmpdir(), "asp-inc-"));
    writeFileSync(join(dir, "a.asp"), `<!--#include file="b.asp"-->`);
    writeFileSync(join(dir, "b.asp"), `<!--#include file="a.asp"-->`);
    expect(() =>
      expandAspIncludes(readFileSync(join(dir, "a.asp"), "utf8"), dir, join(dir, "a.asp"))
    ).toThrow(IncludeCycleError);
  });

  it("ficheiro em falta", () => {
    const dir = mkdtempSync(join(tmpdir(), "asp-inc-"));
    writeFileSync(join(dir, "a.asp"), `<!--#include file="nope.inc"-->`);
    expect(() => expandAspIncludes(readFileSync(join(dir, "a.asp"), "utf8"), dir, join(dir, "a.asp"))).toThrow(
      IncludeNotFoundError
    );
  });
});