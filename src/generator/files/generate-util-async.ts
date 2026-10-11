import type { GeneratorConfigWithDefaultValues } from "../../config/types";
import type { Locale } from "../../runtime/core";
import {
  importTypes,
  OVERRIDE_WARNING,
  relativeFileImportPath,
  relativeFolderImportPath,
} from "../output";
import { writeFileIfContainsChanges } from "../utils/file";
import { prettify, wrapObjectKeyIfNeeded } from "../utils/generator";
import type { Logger } from "../utils/logger";

const NEW_LINE_INDENTED_WITH_COMMA = `,
	`;

const getLocalesTranslationRowAsync = (locale: Locale): string => `
	${wrapObjectKeyIfNeeded(locale)}: () => import('${relativeFolderImportPath(locale)}'),`;

const getNamespaceLoaderForLocale = (locale: Locale, namespaces: string[]) =>
  `${wrapObjectKeyIfNeeded(locale)}: {
	${namespaces
    .map(
      (namespace) =>
        `	${wrapObjectKeyIfNeeded(namespace)}: () => import('${relativeFolderImportPath(`${locale}/${namespace}`)}')`,
    )
    .join(NEW_LINE_INDENTED_WITH_COMMA)}
	}`;

const generateNamespacesCode = (locales: Locale[], namespaces: string[]): [string, string] => {
  const namespaceImports = `
const localeNamespaceLoaders = {
	${locales.map((locale) => getNamespaceLoaderForLocale(locale, namespaces)).join(NEW_LINE_INDENTED_WITH_COMMA)}
}`;

  const namespaceLoader = `
export const importNamespaceAsync = async<Namespace extends Namespaces>(locale: Locales, namespace: Namespace) =>
	(await localeNamespaceLoaders[locale][namespace]()).default as unknown as Translations[Namespace]

export const loadNamespaceAsync = async <Namespace extends Namespaces>(locale: Locales, namespace: Namespace): Promise<void> =>
	void updateDictionary(locale, { [namespace]: await importNamespaceAsync(locale, namespace )})
`;
  return [namespaceImports, namespaceLoader];
};

const getAsyncCode = (
  { utilFileName, formattersTemplateFileName, typesFileName, banner }: GeneratorConfigWithDefaultValues,
  locales: Locale[],
  namespaces: string[],
) => {
  const usesNamespaces = !!namespaces.length;
  const localesTranslationLoaders = locales.map(getLocalesTranslationRowAsync).join("");
  const [namespaceImports, namespaceLoader] = usesNamespaces
    ? generateNamespacesCode(locales, namespaces)
    : ["", ""];

  return `${OVERRIDE_WARNING}
${banner}

import { initFormatters } from '${relativeFileImportPath(formattersTemplateFileName)}'
${importTypes(relativeFileImportPath(typesFileName), "Locales", usesNamespaces && "Namespaces", "Translations")}
import { loadedFormatters, loadedLocales, locales } from '${relativeFileImportPath(utilFileName)}'

const localeTranslationLoaders = {${localesTranslationLoaders}
}
${namespaceImports}

const updateDictionary = (locale: Locales, dictionary: Partial<Translations>): Translations =>
	loadedLocales[locale] = { ...loadedLocales[locale], ...dictionary }

export const importLocaleAsync = async (locale: Locales): Promise<Translations> =>
	(await localeTranslationLoaders[locale]()).default as unknown as Translations

export const loadLocaleAsync = async (locale: Locales): Promise<void> => {
	updateDictionary(locale, await importLocaleAsync(locale))
	loadFormatters(locale)
}

export const loadAllLocalesAsync = (): Promise<void[]> => Promise.all(locales.map(loadLocaleAsync))

export const loadFormatters = (locale: Locales): void =>
	void (loadedFormatters[locale] = initFormatters(locale))
${namespaceLoader}`;
};

export const generateAsyncUtil = async (
  config: GeneratorConfigWithDefaultValues,
  locales: Locale[],
  namespaces: string[],
  logger: Logger,
): Promise<void> => {
  const { outputPath, utilFileName } = config;

  await writeFileIfContainsChanges(
    outputPath,
    `${utilFileName}.async`,
    prettify(getAsyncCode(config, locales, namespaces)),
    logger,
  );
};
