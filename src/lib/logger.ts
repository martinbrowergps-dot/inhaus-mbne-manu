// ── Server-side structured logger ──
// Avoids external deps due to Zod v4 peer conflict.
// Use in server-only contexts (server.ts, server routes).

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel: LogLevel =
  (typeof process !== "undefined" && (process.env.LOG_LEVEL as LogLevel)) || "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL[level] >= LEVEL[currentLevel];
}

function fmt(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] ${level.toUpperCase()} ${msg}`;
  return meta ? `${base} ${JSON.stringify(meta)}` : base;
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog("debug")) console.debug(fmt("debug", msg, meta));
  },
  info(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog("info")) console.info(fmt("info", msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog("warn")) console.warn(fmt("warn", msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>) {
    if (shouldLog("error")) console.error(fmt("error", msg, meta));
  },
};
