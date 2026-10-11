import { getAllLocales } from "../config/locales";
import { getConfigWithDefaultValues } from "../config/read";
import type { GeneratorConfig } from "../config/types";
import { generateLocaleTemplate, generateNamespaceTemplate } from "../generator/files/generate-templates";
import { generate } from "../generator/generate-files";
import { parseLanguageFile } from "../generator/parse-language-file";
import { runCommandAfterGenerator } from "../generator/utils/generator";
import { createLogger, type Logger } from "../generator/utils/logger";
import type { AnyBaseTranslation, BaseTranslation, Locale } from "../runtime/core";

export type ImportLocaleMapping = {
  locale: Locale;
  translations: AnyBaseTranslation;
  /** Top-level keys of `translations` that live in their own folder. */
  namespaces?: string[];
};

export type ImportOptions = {
  /** Regenerate types and util files afterwards. @default true */
  generateTypes?: boolean;
  /** Overrides for `.bun-i18n.json`. */
  config?: GeneratorConfig;
  logger?: Logger;
};

/** Writes one locale to `<outputPath>/<locale>/index.ts`. */
export const storeTranslationToDisk = async (
  localeMapping: ImportLocaleMapping,
  options: ImportOptions = {},
): Promise<Locale | undefined> => (await storeTranslationsToDisk([localeMapping], options))[0];

/**
 * Writes locale files (and namespace files) from in-memory translations,
 * e.g. fetched from a translation service, then regenerates the types.
 * Returns the locales that were written.
 */
export const storeTranslationsToDisk = async (
  localeMappings: ImportLocaleMapping[],
  { generateTypes = true, config: configOverride, logger = createLogger(console, true) }: ImportOptions = {},
): Promise<Locale[]> => {
  const config = await getConfigWithDefaultValues(configOverride);

  const createdLocales: Locale[] = [];
  let baseTranslation: AnyBaseTranslation | undefined;
  let baseNamespaces: string[] = [];

  for (const { locale, translations, namespaces } of localeMappings) {
    if (!locale) continue;

    if (locale === config.baseLocale) {
      baseTranslation = translations;
      baseNamespaces = namespaces || [];
    }

    logger.info(`importing translations for locale '${locale}' ...`);

    const translationsWithoutNamespaces = Object.fromEntries(
      Object.entries(translations).filter(([key]) => !baseNamespaces.includes(key)),
    );

    try {
      await generateLocaleTemplate(config, logger, locale, translationsWithoutNamespaces, undefined, true);
    } catch (error) {
      logger.error(`importing translations for locale '${locale}' failed:`, error);
      continue;
    }

    for (const namespace of baseNamespaces) {
      logger.info(`creating namespace '${locale}/${namespace}' ...`);
      await generateNamespaceTemplate(
        config,
        logger,
        locale,
        namespace,
        (translations as Record<string, BaseTranslation>)[namespace],
        undefined,
        true,
      );
    }

    logger.info(`importing translations for locale '${locale}' completed`);
    createdLocales.push(locale);
  }

  if (!createdLocales.length) {
    logger.warn("nothing to import");
    return [];
  }

  if (!generateTypes) return createdLocales;

  if (!baseTranslation) {
    baseTranslation = (await parseLanguageFile(config.outputPath, config.baseLocale, logger)) || undefined;
    if (!baseTranslation) {
      logger.error(`could not read base locale file '${config.baseLocale}'`);
      return [];
    }
  }

  const locales = await getAllLocales(config.outputPath);

  logger.info("updating types ...");
  await generate(baseTranslation, config, logger, false, locales, baseNamespaces);
  logger.info("updating types completed");

  if (config.runAfterGenerator) await runCommandAfterGenerator(logger, config.runAfterGenerator);

  return createdLocales;
};
