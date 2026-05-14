import type { IncomingMessage } from "node:http";
import { URL } from "node:url";

export function parseQueryFromUrl(urlStr: string | undefined): URLSearchParams {
  if (!urlStr) return new URLSearchParams();
  try {
    const u = new URL(urlStr, "http://localhost");
    return u.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const ch of req) {
    chunks.push(typeof ch === "string" ? Buffer.from(ch) : ch);
  }
  return Buffer.concat(chunks);
}

export function parseFormUrlEncoded(buf: Buffer): URLSearchParams {
  return new URLSearchParams(buf.toString("utf8"));
}
