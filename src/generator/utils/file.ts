import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { FILE_ENDING } from "../output";
import { logger as defaultLogger, type Logger } from "./logger";

export const readFile = async (file: string): Promise<string> => {
  const bunFile = Bun.file(file);
  return (await bunFile.exists()) ? bunFile.text() : "";
};

export const doesPathExist = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

export const createPathIfNotExists = async (
  path: string,
  logger: Logger = defaultLogger,
): Promise<void> => {
  if (await doesPathExist(path)) return;
  await mkdir(path, { recursive: true }).catch((e) =>
    logger.error(`createPath: ${path}`, e),
  );
};

/** Writes `content`, creating parent directories as needed. */
export const writeFile = async (filePath: string, content: string): Promise<void> => {
  await Bun.write(filePath, content);
};

const getFileName = (path: string, file: string) => {
  const hasEnding =
    file.endsWith(FILE_ENDING) ||
    file.endsWith(`${FILE_ENDING}x`) ||
    file.endsWith(".d.ts");
  return join(path, hasEnding ? file : `${file}${FILE_ENDING}`);
};

export const writeNewFile = async (
  path: string,
  file: string,
  content: string,
  logger: Logger = defaultLogger,
): Promise<void> => {
  await writeFile(getFileName(path, file), content);
  logger.info(`generated file: '${path}${path.endsWith("/") ? "" : "/"}${file}'`);
};

export const writeFileIfContainsChanges = async (
  path: string,
  file: string,
  content: string,
  logger: Logger = defaultLogger,
): Promise<void> => {
  const oldContent = await readFile(getFileName(path, file));
  if (oldContent === content) return;
  await writeNewFile(path, file, content, logger);
};

export const writeFileIfNotExists = async (
  path: string,
  file: string,
  content: string,
  logger: Logger = defaultLogger,
): Promise<void> => {
  if (await doesPathExist(getFileName(path, file))) return;
  await writeNewFile(path, file, content, logger);
};

let importCounter = 0;

/**
 * Imports a module fresh (bypassing Bun's module cache) and returns its
 * default export. `null` when the import fails.
 */
export const importFile = async <T = unknown>(
  file: string,
  logger: Logger = defaultLogger,
  outputError = true,
): Promise<T | null> => {
  if (file.endsWith(".json")) {
    const content = await readFile(file);
    return content ? (JSON.parse(content) as T) : null;
  }

  const module = await import(`${file}?bun-i18n=${++importCounter}`).catch((e) => {
    if (outputError) logger.error(`import failed for ${file}`, e);
    return null;
  });
  return (module?.default ?? null) as T | null;
};
