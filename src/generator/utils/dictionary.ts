import type { GeneratorConfigWithDefaultValues } from "../../config/types";
import type { AnyBaseTranslation, Locale } from "../../runtime/core";
import { importTypes, relativeFileImportPath } from "../output";
import { sanitizePath, wrapObjectKeyIfNeeded } from "./generator";
import { getTypeNameForNamespace } from "./namespaces";

/** Source of a `<locale>/index.ts` or `<locale>/<namespace>/index.ts` file. */
export const getDictionaryTemplate = (
  { banner, typesFileName }: GeneratorConfigWithDefaultValues,
  locale: Locale,
  namespace: string | undefined,
  isBaseLocale: boolean,
  translations: AnyBaseTranslation | undefined = undefined,
  editHint = "",
  showBanner = false,
): string => {
  const typeOfDictionary = isBaseLocale
    ? "BaseTranslation"
    : namespace
      ? getTypeNameForNamespace(namespace)
      : "Translation";

  const sanitizedLocale = sanitizePath(locale);
  const variableName = namespace
    ? `${sanitizedLocale}_${sanitizePath(namespace)}`
    : sanitizedLocale;

  const translationsMap = translations ? mapTranslationsToString(translations) : "";

  const hint = editHint
    ? `	// ${editHint}
`
    : "";

  const bannerIfNeeded = showBanner
    ? `
${banner}`
    : "";

  const relativePathPrefix = namespace ? "../../" : "../";

  return `${bannerIfNeeded}
${importTypes(relativeFileImportPath(`${relativePathPrefix}${typesFileName}`), typeOfDictionary)}

const ${variableName} = {
${hint}${translationsMap}
} satisfies ${typeOfDictionary}

export default ${variableName}
`;
};

export const mapTranslationsToString = (
  translations: AnyBaseTranslation,
  level = 1,
): string =>
  Object.entries(translations)
    .map(([key, value]) => mapTranslationToString(level, key, value))
    .join("\n");

const mapTranslationToString = (
  level: number,
  key: string,
  value: AnyBaseTranslation | string,
): string => {
  const inset = "\t".repeat(level);
  if (typeof value === "string") {
    return `${inset}${wrapObjectKeyIfNeeded(key)}: ${getWrappedString(value)},`;
  }
  return `${inset}${wrapObjectKeyIfNeeded(key)}: {
${mapTranslationsToString(value, level + 1)}
${inset}},`;
};

/** Wraps `text` in the quote style that needs the least escaping. */
export const getWrappedString = (text: string, lookForStringType = false): string => {
  const containsSingleQuotes = text.includes("'");
  const containsDoubleQuotes = text.includes('"');
  const containsNewLines = text.includes("\n");
  const containsVariables = text.includes("${string}");

  let wrappingString = "'";
  if (
    containsNewLines ||
    (containsSingleQuotes && containsDoubleQuotes) ||
    (lookForStringType && containsVariables)
  ) {
    wrappingString = "`";
  } else if (containsSingleQuotes) {
    wrappingString = '"';
  }

  return `${wrappingString}${text.replaceAll(wrappingString, `\\${wrappingString}`)}${wrappingString}`;
};
