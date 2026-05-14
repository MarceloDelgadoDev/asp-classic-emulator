export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const order: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

export class Logger {
  constructor(private level: LogLevel = "info") {}

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private should(level: LogLevel): boolean {
    return order[this.level] >= order[level];
  }

  error(msg: string): void {
    if (this.should("error")) console.error(msg);
  }

  warn(msg: string): void {
    if (this.should("warn")) console.warn(msg);
  }

  info(msg: string): void {
    if (this.should("info")) console.log(msg);
  }

  debug(msg: string): void {
    if (this.should("debug")) console.log(msg);
  }
}
