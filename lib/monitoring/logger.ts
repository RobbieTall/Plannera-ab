type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: unknown;
}

function log(level: LogLevel, message: string, context?: unknown): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, context?: unknown) => log("debug", message, context),
  info: (message: string, context?: unknown) => log("info", message, context),
  warn: (message: string, context?: unknown) => log("warn", message, context),
  error: (message: string, context?: unknown) => log("error", message, context),
};
