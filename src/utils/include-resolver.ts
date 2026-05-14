import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

/**
 * `<!--#include file="..."-->` e `<!--#include virtual="..."-->`.
 * - file: relativo ao ficheiro corrente
 * - virtual: relativo à raiz do site
 * Detecção de ciclo: o mesmo ficheiro não pode voltar a entrar na pilha de inclusão.
 */
export class IncludeCycleError extends Error {
  constructor(
    message: string,
    public readonly chain: string[]
  ) {
    super(message);
    this.name = "IncludeCycleError";
  }
}

export class IncludeNotFoundError extends Error {
  constructor(
    message: string,
    public readonly requested: string,
    public readonly resolved: string
  ) {
    super(message);
    this.name = "IncludeNotFoundError";
  }
}

/** Aspas duplas ou simples; case-insensitive. */
function includeDirectiveRe(): RegExp {
  return /<!--\s*#\s*include\s+(file|virtual)\s*=\s*(?:"([^"]*)"|'([^']*)')\s*-->/gi;
}

function assertInsideSiteRoot(targetAbs: string, rootAbs: string): void {
  const rel = relative(rootAbs, resolve(targetAbs));
  if (rel.startsWith("..") || rel === "..") {
    throw new Error(`#include resolve para fora da raiz do site: ${targetAbs}`);
  }
}

/**
 * Substitui todas as diretivas #include no texto pelo conteúdo dos ficheiros (recursivo).
 */
export function expandAspIncludes(
  source: string,
  rootDir: string,
  physicalPath: string,
  stack: string[] = []
): string {
  const rootAbs = resolve(rootDir);
  const currentAbs = resolve(physicalPath);

  if (stack.includes(currentAbs)) {
    throw new IncludeCycleError(`Inclusão circular:\n${[...stack, currentAbs].join("\n→\n")}`, [
      ...stack,
      currentAbs,
    ]);
  }

  const nextStack = [...stack, currentAbs];
  const currentDir = dirname(currentAbs);

  return source.replace(includeDirectiveRe(), (_full, kindRaw: string, doubleQ: string | undefined, singleQ: string | undefined) => {
    const kind = String(kindRaw).toLowerCase();
    const pathRaw = (doubleQ ?? singleQ ?? "").trim();
    if (!pathRaw) {
      throw new Error("#include com caminho vazio");
    }

    const rel = pathRaw.replace(/\\/g, "/");

    let targetAbs: string;
    if (kind === "virtual") {
      const withoutLead = rel.replace(/^\/+/, "");
      targetAbs = resolve(rootAbs, withoutLead);
    } else if (kind === "file") {
      targetAbs = resolve(currentDir, rel);
    } else {
      throw new Error(`#include tipo inválido: ${kindRaw}`);
    }

    assertInsideSiteRoot(targetAbs, rootAbs);

    if (!existsSync(targetAbs)) {
      throw new IncludeNotFoundError(
        `#include ficheiro não encontrado: ${pathRaw}`,
        pathRaw,
        targetAbs
      );
    }

    const inner = readFileSync(targetAbs, "utf8");
    return expandAspIncludes(inner, rootDir, targetAbs, nextStack);
  });
}
