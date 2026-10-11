import { bold, red, yellow } from "./colors";

type LogLevel = "info" | "warn" | "error";

export class BunI18nParseError extends Error {}

export type Logger = {
  info: (...messages: unknown[]) => void;
  warn: (...messages: unknown[]) => void;
  error: (...messages: unknown[]) => void;
};

const PREFIX = "[bun-i18n]";

const colorize = (logLevel: LogLevel, messages: unknown[]): unknown[] => {
  if (logLevel === "info") return [PREFIX, ...messages];
  const color = logLevel === "warn" ? yellow : red;
  return [color(bold([PREFIX, ...messages.map(String)].join(" ")))];
};

const log = (console: Console, logLevel: LogLevel, ...messages: unknown[]) =>
  console[logLevel](...colorize(logLevel, messages));

/**
 * Creates a prefixed, colored logger. With `throwOnError` the error method
 * also throws, which aborts a one-off (`--no-watch`) run.
 */
export const createLogger = (console: Console, throwOnError = false): Logger => ({
  info: (...messages) => log(console, "info", ...messages),
  warn: (...messages) => log(console, "warn", "WARNING:", ...messages),
  error: (...messages) => {
    log(console, "error", "ERROR:", ...messages);
    if (throwOnError) throw new BunI18nParseError(messages.map(String).join(" "));
  },
});

/** A logger that swallows everything (used in tests). */
export const silentLogger: Logger = { info() {}, warn() {}, error() {} };

export const logger: Logger = createLogger(console);
