import { COMMA_SEPARATION } from "../../constants";
import {
  isParsedResultEntry,
  type Arg,
  type JsDocInfo,
  type JsDocInfos,
  type ParsedResult,
  type Types,
} from "../../types";
import { wrapObjectKeyIfNeeded } from "../../utils/generator";
import { createJsDocsString } from "./jsdoc";
import {
  getNestedKey,
  mapToString,
  processNestedParsedResult,
  wrapObjectType,
} from "./utils";

/** `export type TranslationFunctions = { key: (arg: {...}) => LocalizedString }` */
export const createTranslationFunctionsType = (
  parsedTranslations: ParsedResult[],
  jsDocInfo: JsDocInfos,
): string =>
  `export type TranslationFunctions = ${wrapObjectType(parsedTranslations, () =>
    mapToString(parsedTranslations, (translation) =>
      createTranslationFunctionType(translation, jsDocInfo),
    ),
  )}`;

const createTranslationFunctionType = (
  parsedResult: ParsedResult,
  jsDocInfo: JsDocInfos,
): string => {
  if (isParsedResultEntry(parsedResult)) {
    const { key, args, types, parentKeys } = parsedResult;
    const nestedKey = getNestedKey(key, parentKeys);
    const jsDocString = createJsDocsString(jsDocInfo[nestedKey] as JsDocInfo);

    return `
	${jsDocString}${wrapObjectKeyIfNeeded(key)}: (${mapTranslationFunctions(args, types)}) => LocalizedString`;
  }

  return processNestedParsedResult(parsedResult, (entry) =>
    createTranslationFunctionType(entry, jsDocInfo),
  );
};

const mapTranslationFunctions = (args: Arg[] = [], types: Types): string => {
  if (!args.length) return "";

  const seen = new Set<string>();
  const uniqueArgs = args.filter(({ key }) => !seen.has(key) && seen.add(key));
  const firstKey = uniqueArgs[0]?.key as string;

  const isKeyed = Number.isNaN(+firstKey);
  const prefix = isKeyed ? "arg: { " : "";
  const postfix = isKeyed ? " }" : "";
  const argPrefix = isKeyed ? "" : "arg";

  return (
    prefix +
    uniqueArgs
      .map(
        ({ key, optional }) =>
          `${argPrefix}${key}${optional ? "?" : ""}: ${types[key]?.types.join(" | ")}`,
      )
      .join(COMMA_SEPARATION) +
    postfix
  );
};
