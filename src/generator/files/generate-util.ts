import type { GeneratorConfigWithDefaultValues } from "../../config/types";
import type { Locale } from "../../runtime/core";
import { importTypes, OVERRIDE_WARNING, PACKAGE_NAME, relativeFileImportPath } from "../output";
import { writeFileIfContainsChanges } from "../utils/file";
import { prettify } from "../utils/generator";
import type { Logger } from "../utils/logger";

const getUtil = (
  { typesFileName, baseLocale, banner }: GeneratorConfigWithDefaultValues,
  locales: Locale[],
  namespaces: string[],
): string => {
  const usesNamespaces = !!namespaces.length;

  const localesEnum = `
export const locales: Locales[] = [${locales.map(
    (locale) => `
	'${locale}'`,
  )}
]`;

  const namespacesEnum = usesNamespaces
    ? `

export const namespaces: Namespaces[] = [${namespaces.map(
        (namespace) => `
	'${namespace}'`,
      )}
]
`
    : "";

  const isNamespace = usesNamespaces
    ? `
export const isNamespace = (namespace: string): namespace is Namespaces => namespaces.includes(namespace as Namespaces)`
    : "";

  return `${OVERRIDE_WARNING}
${banner}

import { i18n as initI18n, i18nObject as initI18nObject, i18nString as initI18nString } from '${PACKAGE_NAME}'
${importTypes(`${PACKAGE_NAME}/detectors`, "LocaleDetector")}
${importTypes(PACKAGE_NAME, "LocaleTranslationFunctions", "TranslateByString")}
import { detectLocale as detectLocaleFn } from '${PACKAGE_NAME}/detectors'
import { initExtendDictionary } from '${PACKAGE_NAME}/utils'
${importTypes(
  relativeFileImportPath(typesFileName),
  "Formatters",
  "Locales",
  usesNamespaces && "Namespaces",
  "Translations",
  "TranslationFunctions",
)}

export const baseLocale: Locales = '${baseLocale}'

${localesEnum}
${namespacesEnum}

export const isLocale = (locale: string): locale is Locales => locales.includes(locale as Locales)
${isNamespace}

export const loadedLocales: Record<Locales, Translations> = {} as Record<Locales, Translations>

export const loadedFormatters: Record<Locales, Formatters> = {} as Record<Locales, Formatters>

export const extendDictionary = initExtendDictionary<Translations>()

export const i18nString = (locale: Locales): TranslateByString => initI18nString<Locales, Formatters>(locale, loadedFormatters[locale])

export const i18nObject = (locale: Locales): TranslationFunctions =>
	initI18nObject<Locales, Translations, TranslationFunctions, Formatters>(
		locale,
		loadedLocales[locale],
		loadedFormatters[locale]
	)

export const i18n = (): LocaleTranslationFunctions<Locales, Translations, TranslationFunctions> =>
	initI18n<Locales, Translations, TranslationFunctions, Formatters>(loadedLocales, loadedFormatters)

export const detectLocale = (...detectors: LocaleDetector[]): Locales => detectLocaleFn<Locales>(baseLocale, locales, ...detectors)
`;
};

export const generateUtil = async (
  config: GeneratorConfigWithDefaultValues,
  locales: Locale[],
  namespaces: string[],
  logger: Logger,
): Promise<void> => {
  const { outputPath, utilFileName } = config;

  await writeFileIfContainsChanges(outputPath, utilFileName, prettify(getUtil(config, locales, namespaces)), logger);
};
