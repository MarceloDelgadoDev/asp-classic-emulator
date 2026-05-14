/** Buffer de saída ASP (Response). */
export interface ResponseObject {
  Write(value: unknown): void;
  End(): void;
  Clear(): void;
  /** Cabeçalhos mínimos */
  ContentType: string;
  Charset: string;
  getOutput(): string;
  getHeaders(): Record<string, string>;
}

export function createResponseObject(): ResponseObject {
  const chunks: string[] = [];
  let ended = false;
  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
  };
  return {
    ContentType: "text/html",
    Charset: "utf-8",
    Write(value: unknown): void {
      if (ended) return;
      if (value === undefined || value === null) chunks.push("");
      else chunks.push(String(value));
    },
    End(): void {
      ended = true;
    },
    Clear(): void {
      chunks.length = 0;
    },
    getOutput(): string {
      return chunks.join("");
    },
    getHeaders(): Record<string, string> {
      const ct = headers["Content-Type"] ?? `text/html; charset=${this.Charset}`;
      return { ...headers, "Content-Type": ct };
    },
  };
}
