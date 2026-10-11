import type { GeneratorConfigWithDefaultValues } from "../../config/types";
import type { AnyBaseTranslation, Locale } from "../../runtime/core";
import { OVERRIDE_WARNING, PACKAGE_NAME } from "../output";
import { isParsedResultEntry, type JsDocInfos, type ParsedResult } from "../types";
import { writeFileIfContainsChanges } from "../utils/file";
import { prettify, wrapObjectKeyIfNeeded } from "../utils/generator";
import type { Logger } from "../utils/logger";
import { getTypeNameForNamespace } from "../utils/namespaces";
import { createTypeImports } from "./types/external-type-imports";
import { createFormattersType } from "./types/formatters-type";
import { createNamespacesTypes, validateNamespaces } from "./types/namespaces";
import { parseDictionary } from "./types/parse-dictionary";
import { createTranslationFunctionsType } from "./types/translation-functions";
import { createTranslationType } from "./types/translations";
import { flattenToParsedResultEntry, getNestedKey, wrapUnionType } from "./types/utils";

const createLocalesType = (locales: string[], baseLocale: string) => {
  const usedLocales = locales.length ? locales : [baseLocale];
  return `export type Locales =${wrapUnionType(usedLocales)}`;
};

const createJsDocsMapping = (parsedTranslations: ParsedResult[]): JsDocInfos => {
  const map: JsDocInfos = {};

  for (const { key, textWithoutTypes, types, args = [], parentKeys } of flattenToParsedResultEntry(
    parsedTranslations,
  )) {
    map[getNestedKey(key, parentKeys)] = {
      text: textWithoutTypes,
      types,
      pluralOnlyArgs: args.filter(({ pluralOnly }) => pluralOnly === true).map(({ key }) => key),
    };
  }

  return map;
};

const doesATranslationContainParams = (parsedResults: ParsedResult[]): boolean =>
  parsedResults.some((parsedResult) =>
    isParsedResultEntry(parsedResult)
      ? !!parsedResult.args?.some(({ pluralOnly }) => pluralOnly !== true)
      : doesATranslationContainParams(Object.values(parsedResult).flat()),
  );

const getTypes = (
  { translations, baseLocale, locales, typesTemplateFileName, banner, namespaces }: GenerateTypesType,
  logger: Logger,
): [string, boolean] => {
  const usesNamespaces = !!namespaces.length;
  validateNamespaces(translations, namespaces, logger);

  const parsedTranslations = parseDictionary(translations, logger);

  const externalTypeImports = createTypeImports(parsedTranslations, typesTemplateFileName);

  const localesType = createLocalesType(locales, baseLocale);

  const jsDocsInfo = createJsDocsMapping(parsedTranslations);

  const translationType = createTranslationType(parsedTranslations, jsDocsInfo, "RootTranslation", namespaces);

  const shouldImportRequiredParamsType = doesATranslationContainParams(parsedTranslations);

  const namespacesType = usesNamespaces ? createNamespacesTypes(namespaces) : "";

  const translationArgsType = createTranslationFunctionsType(parsedTranslations, jsDocsInfo);

  const formattersType = createFormattersType(parsedTranslations);

  const type = `${OVERRIDE_WARNING}
${banner}
import type { BaseTranslation as BaseTranslationType${parsedTranslations.length ? ", LocalizedString" : ""}${
    shouldImportRequiredParamsType ? ", RequiredParams" : ""
  } } from '${PACKAGE_NAME}'
${externalTypeImports}
export type BaseTranslation = BaseTranslationType${usesNamespaces ? " & DisallowNamespaces" : ""}
export type BaseLocale = '${baseLocale}'

${localesType}

export type Translation = RootTranslation${usesNamespaces ? " & DisallowNamespaces" : ""}

export type Translations = RootTranslation${
    usesNamespaces
      ? ` &
{${namespaces.map(
          (namespace) => `
	${wrapObjectKeyIfNeeded(namespace)}: ${getTypeNameForNamespace(namespace)}`,
        )}
}
`
      : ""
  }

${translationType}

${namespacesType}

${translationArgsType}

${formattersType}
`;

  return [type, !!externalTypeImports];
};

export type GenerateTypesType = GeneratorConfigWithDefaultValues & {
  translations: AnyBaseTranslation;
  locales: Locale[];
  namespaces: string[];
};

/** Writes the types file. Returns whether custom (external) types are referenced. */
export const generateTypes = async (config: GenerateTypesType, logger: Logger): Promise<boolean> => {
  const { outputPath, typesFileName } = config;

  const [types, hasCustomTypes] = getTypes(config, logger);

  await writeFileIfContainsChanges(outputPath, typesFileName, prettify(types), logger);

  return hasCustomTypes;
};
