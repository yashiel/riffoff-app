type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function formatEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    return JSON.stringify(entry);
  }
  return `[${entry.context}] ${entry.message}`;
}

function log(level: LogLevel, context: string, message: string, data?: unknown) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...(data !== undefined && { data }),
  };

  const formatted = formatEntry(entry);
  const args = IS_PRODUCTION ? [formatted] : data !== undefined ? [formatted, data] : [formatted];

  switch (level) {
    case "info":
      console.info(...args);
      break;
    case "warn":
      console.warn(...args);
      break;
    case "error":
      console.error(...args);
      break;
  }
}

/** Create a logger scoped to a context (e.g., "auth", "payments.paypal") */
export function createLogger(context: string) {
  return {
    info: (message: string, data?: unknown) => log("info", context, message, data),
    warn: (message: string, data?: unknown) => log("warn", context, message, data),
    error: (message: string, data?: unknown) => log("error", context, message, data),
  };
}
