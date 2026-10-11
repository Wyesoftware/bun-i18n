import { join } from "node:path";
import type { GeneratorConfigWithDefaultValues } from "../../config/types";
import type { AnyBaseTranslation, Locale } from "../../runtime/core";
import { FILE_ENDING, importTypes, PACKAGE_NAME, relativeFileImportPath } from "../output";
import { getDictionaryTemplate } from "../utils/dictionary";
import { writeFileIfContainsChanges, writeFileIfNotExists } from "../utils/file";
import { prettify } from "../utils/generator";
import type { Logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// formatters.ts
// ---------------------------------------------------------------------------

const getFormattersTemplate = ({ typesFileName }: GeneratorConfigWithDefaultValues) => `
${importTypes(PACKAGE_NAME, "FormattersInitializer")}
${importTypes(relativeFileImportPath(typesFileName), "Locales", "Formatters")}

export const initFormatters: FormattersInitializer<Locales, Formatters> = (locale: Locales) => {

	const formatters: Formatters = {
		// add your formatter functions here
	}

	return formatters
}
`;

/** Written once; the user maintains it afterwards. */
export const generateFormattersTemplate = async (
  config: GeneratorConfigWithDefaultValues,
  forceOverride: boolean,
  logger: Logger,
): Promise<void> => {
  const { outputPath, formattersTemplateFileName } = config;

  const write = forceOverride ? writeFileIfContainsChanges : writeFileIfNotExists;
  await write(outputPath, formattersTemplateFileName, prettify(getFormattersTemplate(config)), logger);
};

// ---------------------------------------------------------------------------
// custom-types.ts
// ---------------------------------------------------------------------------

const getCustomTypesTemplate = ({ typesFileName }: GeneratorConfigWithDefaultValues) =>
  `// use this file to export your custom types; these types will be imported by './${typesFileName}${FILE_ENDING}'`;

export const generateCustomTypesTemplate = async (
  config: GeneratorConfigWithDefaultValues,
  forceOverride: boolean,
  logger: Logger,
): Promise<void> => {
  const { outputPath, typesTemplateFileName } = config;

  const write = forceOverride ? writeFileIfContainsChanges : writeFileIfNotExists;
  await write(outputPath, typesTemplateFileName, prettify(getCustomTypesTemplate(config)), logger);
};

// ---------------------------------------------------------------------------
// <locale>/index.ts
// ---------------------------------------------------------------------------

export const generateLocaleTemplate = async (
  config: GeneratorConfigWithDefaultValues,
  logger: Logger,
  locale: Locale,
  translations: AnyBaseTranslation | undefined = undefined,
  editHint = "",
  showBanner = false,
): Promise<void> => {
  const { outputPath, baseLocale } = config;

  const localeTemplate = getDictionaryTemplate(
    config,
    locale,
    undefined,
    baseLocale === locale,
    translations,
    editHint,
    showBanner,
  );

  await writeFileIfContainsChanges(join(outputPath, locale), `index${FILE_ENDING}`, prettify(localeTemplate), logger);
};

// ---------------------------------------------------------------------------
// <locale>/<namespace>/index.ts
// ---------------------------------------------------------------------------

export const generateNamespaceTemplate = async (
  config: GeneratorConfigWithDefaultValues,
  logger: Logger,
  locale: Locale,
  namespace: string,
  translations: AnyBaseTranslation | undefined = undefined,
  editHint = "",
  showBanner = false,
): Promise<void> => {
  const { outputPath, baseLocale } = config;

  const localeTemplate = getDictionaryTemplate(
    config,
    locale,
    namespace,
    baseLocale === locale,
    translations,
    editHint,
    showBanner,
  );

  logger.info(`creating boilerplate for locale '${locale}' and namespace '${namespace}'`);

  await writeFileIfContainsChanges(
    join(outputPath, locale, namespace),
    `index${FILE_ENDING}`,
    prettify(localeTemplate),
    logger,
  );
};
