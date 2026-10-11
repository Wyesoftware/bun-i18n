import { $ } from "bun";
import type { Logger } from "./logger";

/** Locale and namespace folder names become identifiers in generated code. */
export const sanitizePath = <Type extends string>(part: Type): Type =>
  part.replace(/[-\s]/g, "_") as Type;

// ES2015 reserved words (strict mode), which cannot be used as unquoted keys.
const RESERVED_WORDS = new Set([
  "await", "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "enum", "export", "extends", "false",
  "finally", "for", "function", "if", "implements", "import", "in",
  "instanceof", "interface", "let", "new", "null", "package", "private",
  "protected", "public", "return", "static", "super", "switch", "this",
  "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield",
]);

const REGEX_IDENTIFIER = /^[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*$/u;

export const isIdentifier = (key: string): boolean =>
  REGEX_IDENTIFIER.test(key) && !RESERVED_WORDS.has(key);

export const wrapObjectKeyIfNeeded = (key: string): string =>
  isIdentifier(key) ? key : `'${key.replace(/'/g, "\\'")}'`;

export const prettify = (content: string): string =>
  content
    .replace(/^(\n)+/, "") // remove all new-lines on top of the file
    .replace(/\n\n+/g, "\n\n") // remove multiple new-lines
    .replace(/(\n)+$/, "\n") // remove all multiple trailing new-lines
    .replace(/\t\n/g, "\n"); // remove all tabs at the end of a line

export const runCommandAfterGenerator = async (
  logger: Logger,
  runAfterGenerator: string,
): Promise<void> => {
  logger.info(`running command '${runAfterGenerator}'`);

  const output = await $`${{ raw: runAfterGenerator }}`.nothrow().text();
  logger.info(
    `output: \n>\n${output
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n")}`,
  );
};
