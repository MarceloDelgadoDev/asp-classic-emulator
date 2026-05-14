import type { Variant } from "../interpreter/variant.js";

function mapFromParams(params: URLSearchParams): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [k, v] of params.entries()) {
    const key = k.toLowerCase();
    const cur = m.get(key) ?? [];
    cur.push(v);
    m.set(key, cur);
  }
  return m;
}

/** Coleção estilo ASP (QueryString / Form). */
export function createAspCollection(data: Map<string, string[]>): object {
  return {
    __vbGetProp(_p: string): Variant {
      return undefined;
    },
    __vbCallMethod(_method: string, args: Variant[]): Variant {
      const key = String(args[0] ?? "").toLowerCase();
      const arr = data.get(key);
      return arr?.[0] ?? "";
    },
  };
}

export interface RequestObject {
  QueryString: object;
  Form: object;
  __vbGetProp(prop: string): Variant;
}

export function createRequestObject(query: URLSearchParams, form: URLSearchParams): RequestObject {
  const qm = mapFromParams(query);
  const fm = mapFromParams(form);
  const qs = createAspCollection(qm);
  const fo = createAspCollection(fm);
  return {
    QueryString: qs,
    Form: fo,
    __vbGetProp(prop: string): Variant {
      const p = prop.toLowerCase();
      if (p === "querystring") return qs as Variant;
      if (p === "form") return fo as Variant;
      return undefined;
    },
  };
}
