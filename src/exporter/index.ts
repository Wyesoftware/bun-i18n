import { findAllNamespacesForLocale, getAllLocales } from "../config/locales";
import { getConfigWithDefaultValues } from "../config/read";
import type { GeneratorConfig } from "../config/types";
import { parseLanguageFile } from "../generator/parse-language-file";
import { createLogger, type Logger } from "../generator/utils/logger";
import type { AnyBaseTranslation, BaseTranslation, Locale } from "../runtime/core";

export type ExportLocaleMapping = {
  locale: Locale;
  translations: AnyBaseTranslation;
  namespaces: string[];
};

export type ExportOptions = {
  /** Overrides for `.bun-i18n.json`. */
  config?: GeneratorConfig;
  logger?: Logger;
};

const readTranslation = async (
  locale: Locale,
  outputPath: string,
  logger: Logger,
): Promise<ExportLocaleMapping> => {
  logger.info(`exporting translations for locale '${locale}' ...`);

  const translations = await parseLanguageFile(outputPath, locale, logger);
  if (!translations) {
    logger.error(`could not find locale file '${locale}'`);
    return { locale, translations: {}, namespaces: [] };
  }

  const namespaces = findAllNamespacesForLocale(locale, outputPath);
  for (const namespace of namespaces) {
    logger.info(`adding namespace '${locale}/${namespace}' ...`);
    (translations as Record<string, BaseTranslation>)[namespace] =
      ((await parseLanguageFile(outputPath, locale, logger, namespace)) as BaseTranslation) || {};
  }

  logger.info(`exporting translations for locale '${locale}' completed`);

  return { locale, translations, namespaces };
};

/** Reads one locale (including its namespaces) from disk as plain objects. */
export const readTranslationFromDisk = async (
  locale: Locale,
  { config: configOverride, logger = createLogger(console, true) }: ExportOptions = {},
): Promise<ExportLocaleMapping> => {
  const { outputPath } = await getConfigWithDefaultValues(configOverride);
  return readTranslation(locale, outputPath, logger);
};

/** Reads every locale found in `outputPath`. */
export const readTranslationsFromDisk = async ({
  config: configOverride,
  logger = createLogger(console, true),
}: ExportOptions = {}): Promise<ExportLocaleMapping[]> => {
  const { outputPath } = await getConfigWithDefaultValues(configOverride);
  const locales = await getAllLocales(outputPath);
  return Promise.all(locales.map((locale) => readTranslation(locale, outputPath, logger)));
};
