import type { GeneratorConfigWithDefaultValues } from "../../config/types";
import type { Locale } from "../../runtime/core";
import {
  importTypes,
  OVERRIDE_WARNING,
  relativeFileImportPath,
  relativeFolderImportPath,
} from "../output";
import { writeFileIfContainsChanges } from "../utils/file";
import { prettify, sanitizePath, wrapObjectKeyIfNeeded } from "../utils/generator";
import type { Logger } from "../utils/logger";

const combineNamespacesSingleToObject = (sanitizedLocale: string, namespaces: string[]) => `{
		...${sanitizedLocale}${namespaces
      .map(
        (namespace) => `,
		${wrapObjectKeyIfNeeded(namespace)}: ${sanitizedLocale}_${sanitizePath(namespace)}`,
      )
      .join("")}
	}`;

const getLocalesTranslationRowSync = (locale: Locale, namespaces: string[]): string => {
  const sanitizedLocale = sanitizePath(locale);
  const needsEscaping = locale !== sanitizedLocale;
  const postfix = namespaces.length
    ? `: ${combineNamespacesSingleToObject(sanitizedLocale, namespaces)}`
    : needsEscaping
      ? `: ${sanitizedLocale}`
      : "";

  return `
	${wrapObjectKeyIfNeeded(locale)}${postfix},`;
};

const getSyncCode = (
  { utilFileName, formattersTemplateFileName, typesFileName, banner }: GeneratorConfigWithDefaultValues,
  locales: Locale[],
  namespaces: string[],
) => {
  const localesImports = locales
    .map(
      (locale) => `
import ${sanitizePath(locale)} from '${relativeFolderImportPath(locale)}'`,
    )
    .join("");

  const namespaceImports = locales
    .map((locale) =>
      namespaces
        .map(
          (namespace) => `
import ${sanitizePath(locale)}_${sanitizePath(namespace)} from '${relativeFolderImportPath(`${locale}/${namespace}`)}'`,
        )
        .join(""),
    )
    .join("");

  const localesTranslations = locales.map((locale) => getLocalesTranslationRowSync(locale, namespaces)).join("");

  return `${OVERRIDE_WARNING}
${banner}

import { initFormatters } from '${relativeFileImportPath(formattersTemplateFileName)}'
${importTypes(relativeFileImportPath(typesFileName), "Locales", "Translations")}
import { loadedFormatters, loadedLocales, locales } from '${relativeFileImportPath(utilFileName)}'

${localesImports}

${namespaceImports}

const localeTranslations = {${localesTranslations}
}

export const loadLocale = (locale: Locales): void => {
	if (loadedLocales[locale]) return

	loadedLocales[locale] = localeTranslations[locale] as unknown as Translations
	loadFormatters(locale)
}

export const loadAllLocales = (): void => locales.forEach(loadLocale)

export const loadFormatters = (locale: Locales): void =>
	void (loadedFormatters[locale] = initFormatters(locale))
`;
};

export const generateSyncUtil = async (
  config: GeneratorConfigWithDefaultValues,
  locales: Locale[],
  namespaces: string[],
  logger: Logger,
): Promise<void> => {
  const { outputPath, utilFileName } = config;

  await writeFileIfContainsChanges(
    outputPath,
    `${utilFileName}.sync`,
    prettify(getSyncCode(config, locales, namespaces)),
    logger,
  );
};
