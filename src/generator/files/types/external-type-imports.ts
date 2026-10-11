import { COMMA_SEPARATION } from "../../constants";
import { importTypes } from "../../output";
import { isParsedResultEntry, type ParsedResult } from "../../types";

const BASE_TYPES = [
  "boolean",
  "number",
  "bigint",
  "string",
  "Date",
  "object",
  "undefined",
  "null",
  "unknown",
  "LocalizedString",
].flatMap((t) => [t, `${t}[]`, `Array<${t}>`]);

const extractTypes = (parsedTranslations: ParsedResult[]): string[] =>
  parsedTranslations.flatMap((parsedTranslation) =>
    isParsedResultEntry(parsedTranslation)
      ? Object.values(parsedTranslation.types).flatMap(({ types }) => types)
      : extractTypes(Object.values(parsedTranslation).flat()),
  );

/** Import statement for user-defined argument types (`{0:Result}`). */
export const createTypeImports = (
  parsedTranslations: ParsedResult[],
  typesTemplatePath: string,
): string => {
  const externalTypes = [...new Set(extractTypes(parsedTranslations))]
    .filter(
      (type) =>
        !BASE_TYPES.includes(type) &&
        !(type.includes("|") || type.startsWith("'") || type.endsWith("'")),
    )
    .sort();

  if (!externalTypes.length) return "";

  return `
${importTypes(`./${typesTemplatePath.replace(".ts", "")}`, externalTypes.join(COMMA_SEPARATION))}
`;
};
