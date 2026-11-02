export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  readonly [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

const LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = { debug: 10, info: 20, warn: 30, error: 40 };

const REDACTED_KEYS = new Set(['password', 'token', 'authorization', 'secret']);

type Sink = (line: string) => void;

export function createLogger(
  level: LogLevel,
  base: LogFields = {},
  sink: Sink = (line) => process.stdout.write(`${line}\n`),
): Logger {
  const threshold = LEVEL_WEIGHT[level];

  const write = (entryLevel: LogLevel, message: string, fields?: LogFields): void => {
    if (LEVEL_WEIGHT[entryLevel] < threshold) return;
    const entry = {
      ts: new Date().toISOString(),
      level: entryLevel,
      msg: message,
      ...redact({ ...base, ...(fields ?? {}) }),
    };
    sink(JSON.stringify(entry));
  };

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
    child: (fields) => createLogger(level, { ...base, ...fields }, sink),
  };
}

export function redact(fields: LogFields): LogFields {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[redacted]' : value;
  }
  return out;
}

export const noopLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => noopLogger,
};
