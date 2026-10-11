import type { Adapter, GeneratorConfigWithDefaultValues } from "../config/types";
import type { AnyBaseTranslation, Locale } from "../runtime/core";
import { generateBunAdapter, generateReactAdapter } from "./files/generate-adapters";
import {
  generateCustomTypesTemplate,
  generateFormattersTemplate,
  generateLocaleTemplate,
  generateNamespaceTemplate,
} from "./files/generate-templates";
import { generateTypes } from "./files/generate-types";
import { generateUtil } from "./files/generate-util";
import { generateAsyncUtil } from "./files/generate-util-async";
import { generateSyncUtil } from "./files/generate-util-sync";
import { logger as defaultLogger, type Logger } from "./utils/logger";
import { findAllNamespacesForLocale } from "./utils/namespaces";

/** Creates `<locale>/<namespace>/index.ts` stubs for namespaces missing in non-base locales. */
export const generateNamespaceFiles = async (
  config: GeneratorConfigWithDefaultValues,
  logger: Logger,
  locales: Locale[] = [],
  namespaces: string[] = [],
  forceOverride: boolean,
): Promise<void> => {
  const promises: Promise<unknown>[] = [];

  for (const locale of locales.filter((locale) => locale !== config.baseLocale)) {
    const foundNamespaces = findAllNamespacesForLocale(locale, config.outputPath);
    const missingNamespaces = namespaces.filter(
      (namespace) => forceOverride || !foundNamespaces.includes(namespace),
    );

    for (const missingNamespace of missingNamespaces) {
      promises.push(
        generateNamespaceTemplate(config, logger, locale, missingNamespace, undefined, "TODO: insert translations"),
      );
    }
  }

  await Promise.all(promises);
};

const REPOSITORY_URL = "https://github.com/Wyesoftware/bun-i18n";

/** On the very first run: a base locale with an example plus one example locale. */
const generateDictionaryFiles = async (
  config: GeneratorConfigWithDefaultValues,
  forceOverride: boolean,
  logger: Logger,
): Promise<void> => {
  if (!forceOverride) return;

  const dummyTranslations = {
    en: `Hi {name}! Please leave a star if you like this project: ${REPOSITORY_URL}`,
    de: `Hallo {name}! Bitte hinterlasse einen Stern, wenn dir das Projekt gefällt: ${REPOSITORY_URL}`,
  };

  const primaryLocale = config.baseLocale.startsWith("de") ? "de" : "en";
  const secondaryLocale = primaryLocale === "de" ? "en" : "de";

  await Promise.all([
    generateLocaleTemplate(
      config,
      logger,
      config.baseLocale,
      { HI: dummyTranslations[primaryLocale].replace("{name}", "{name:string}") },
      "TODO: your translations go here",
    ),
    generateLocaleTemplate(
      config,
      logger,
      secondaryLocale,
      { HI: dummyTranslations[secondaryLocale] },
      "this is an example Translation, just rename or delete this folder if you want",
    ),
  ]);
};

const getAdapters = ({ adapter, adapters }: GeneratorConfigWithDefaultValues): Adapter[] =>
  adapters ?? (adapter ? [adapter] : []);

/**
 * Writes every generated file for the given base translation.
 *
 * @param forceOverride also (re)write the files that are normally written only once
 */
export const generate = async (
  translations: AnyBaseTranslation,
  config: GeneratorConfigWithDefaultValues,
  logger: Logger = defaultLogger,
  forceOverride = false,
  locales: Locale[] = [],
  namespaces: string[] = [],
): Promise<void> => {
  const hasCustomTypes = await generateTypes({ ...config, translations, locales, namespaces }, logger);

  const promises: Promise<unknown>[] = [];

  if (hasCustomTypes) {
    promises.push(generateCustomTypesTemplate(config, forceOverride, logger));
  }

  promises.push(generateDictionaryFiles(config, forceOverride, logger));
  promises.push(generateNamespaceFiles(config, logger, locales, namespaces, forceOverride));

  if (config.generateOnlyTypes) {
    await Promise.all(promises);
    return;
  }

  promises.push(generateFormattersTemplate(config, forceOverride, logger));

  promises.push(generateUtil(config, locales, namespaces, logger));
  promises.push(generateSyncUtil(config, locales, namespaces, logger));
  promises.push(generateAsyncUtil(config, locales, namespaces, logger));

  for (const adapter of getAdapters(config)) {
    const adapterConfig = { ...config, adapters: undefined, adapter };
    promises.push(
      adapter === "react" ? generateReactAdapter(adapterConfig, logger) : generateBunAdapter(adapterConfig, logger),
    );
  }

  await Promise.all(promises);
};
