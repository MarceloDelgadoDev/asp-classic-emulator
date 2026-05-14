/** Placeholder para Session em memória (Fase 2). */
export interface SessionStore {
  get(id: string): Map<string, unknown> | undefined;
  set(id: string, data: Map<string, unknown>): void;
}

export class MemorySessionStore implements SessionStore {
  private readonly m = new Map<string, Map<string, unknown>>();
  get(id: string) {
    return this.m.get(id);
  }
  set(id: string, data: Map<string, unknown>) {
    this.m.set(id, data);
  }
}
