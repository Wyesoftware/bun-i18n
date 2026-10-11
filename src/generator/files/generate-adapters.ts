import type { GeneratorConfigWithDefaultValues } from "../../config/types";
import { importTypes, OVERRIDE_WARNING, PACKAGE_NAME, relativeFileImportPath } from "../output";
import { writeFileIfContainsChanges } from "../utils/file";
import { prettify } from "../utils/generator";
import type { Logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// bun (server): every locale is loaded eagerly
// ---------------------------------------------------------------------------

const getBunAdapter = ({ utilFileName, banner, typesFileName }: GeneratorConfigWithDefaultValues) => `${OVERRIDE_WARNING}
${banner}

import { i18n } from '${relativeFileImportPath(utilFileName)}'
import { loadAllLocales } from '${relativeFileImportPath(`${utilFileName}.sync`)}'
${importTypes(PACKAGE_NAME, "LocaleTranslationFunctions")}
${importTypes(relativeFileImportPath(typesFileName), "Locales", "Translations", "TranslationFunctions")}

loadAllLocales()

export const L: LocaleTranslationFunctions<Locales, Translations, TranslationFunctions> = i18n()

export default L
`;

export const generateBunAdapter = async (config: GeneratorConfigWithDefaultValues, logger: Logger): Promise<void> => {
  const fileName = config.adapterFileName || "i18n-bun";
  await writeFileIfContainsChanges(config.outputPath, fileName, prettify(getBunAdapter(config)), logger);
};

// ---------------------------------------------------------------------------
// react: provider component, context and hook
// ---------------------------------------------------------------------------

const getReactAdapter = ({ utilFileName, typesFileName, banner }: GeneratorConfigWithDefaultValues) => `${OVERRIDE_WARNING}
${banner}

import { initI18nReact } from '${PACKAGE_NAME}/react'
${importTypes(relativeFileImportPath(typesFileName), "Formatters", "Locales", "TranslationFunctions", "Translations")}
import { loadedFormatters, loadedLocales } from '${relativeFileImportPath(utilFileName)}'

const { component: TypesafeI18n, context: I18nContext, useI18nContext } = initI18nReact<Locales, Translations, TranslationFunctions, Formatters>(loadedLocales, loadedFormatters)

export { I18nContext, useI18nContext }

export default TypesafeI18n
`;

export const generateReactAdapter = async (config: GeneratorConfigWithDefaultValues, logger: Logger): Promise<void> => {
  const fileName = config.adapterFileName || "i18n-react";
  await writeFileIfContainsChanges(config.outputPath, `${fileName}.tsx`, prettify(getReactAdapter(config)), logger);
};
