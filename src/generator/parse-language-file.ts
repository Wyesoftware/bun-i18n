import { resolve } from "node:path";
import type { AnyBaseTranslation, Locale } from "../runtime/core";
import { FILE_ENDING } from "./output";
import { doesPathExist, importFile } from "./utils/file";
import type { Logger } from "./utils/logger";

/**
 * Loads `<outputPath>/<locale>[/<namespace>]/index.ts` and returns its default
 * export. Bun imports TypeScript directly, so no transpile step is needed.
 */
export const parseLanguageFile = async (
  outputPath: string,
  locale: Locale,
  logger: Logger,
  namespace = "",
): Promise<AnyBaseTranslation | null> => {
  const fileName = namespace ? `${locale}/${namespace}` : locale;
  const type = namespace ? "namespace" : "base locale";

  const path = resolve(outputPath, fileName, `index${FILE_ENDING}`);

  if (!(await doesPathExist(path))) {
    logger.info(`could not load ${type} file '${fileName}'`);
    return null;
  }

  const translations = await importFile<AnyBaseTranslation>(path, logger);
  if (!translations) {
    logger.error(`could not read default export from ${type} file '${fileName}'`);
    return null;
  }

  return translations;
};
