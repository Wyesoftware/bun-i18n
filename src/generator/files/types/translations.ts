import { createParameterPart, REGEX_BRACKETS } from "../../../parser/advanced/parse";
import { serializeMessageWithoutTypes } from "../../../parser/advanced/serialize";
import type { TransformParameterPart } from "../../../parser/advanced/types";
import { NEW_LINE, PIPE_SEPARATION } from "../../constants";
import {
  isParsedResultEntry,
  type Arg,
  type JsDocInfo,
  type JsDocInfos,
  type ParsedResult,
} from "../../types";
import { getWrappedString } from "../../utils/dictionary";
import { wrapObjectKeyIfNeeded } from "../../utils/generator";
import { getTypeNameForNamespace } from "../../utils/namespaces";
import { createJsDocsString } from "./jsdoc";
import {
  getNestedKey,
  mapToString,
  processNestedParsedResult,
  wrapObjectType,
} from "./utils";

/**
 * `type RootTranslation = { key: RequiredParams<'a' | 'b'> }` plus one
 * exported type per namespace.
 */
export const createTranslationType = (
  parsedTranslations: ParsedResult[],
  jsDocInfo: JsDocInfos,
  nameOfType: string,
  namespaces: string[] = [],
): string => {
  const isNamespaceEntry = (parsedResult: ParsedResult) => {
    const keys = Object.keys(parsedResult);
    return keys.length === 1 && namespaces.includes(keys[0] as string);
  };

  const parsedTranslationsWithoutNamespaces = parsedTranslations.filter(
    (parsedResult) => !isNamespaceEntry(parsedResult),
  );

  const translationType = `type ${nameOfType} = ${wrapObjectType(
    parsedTranslationsWithoutNamespaces,
    () =>
      mapToString(parsedTranslationsWithoutNamespaces, (entry) =>
        createTranslationTypeEntry(entry, jsDocInfo),
      ),
  )}`;

  const namespaceTranslationsTypes = parsedTranslations
    .filter(isNamespaceEntry)
    .map((value) => Object.entries(value).flat() as [string, ParsedResult[]])
    .map(([namespace, namespaceTranslations]) =>
      Array.isArray(namespaceTranslations)
        ? `export ${createTranslationType(
            namespaceTranslations,
            jsDocInfo,
            getTypeNameForNamespace(namespace),
          )}`
        : "",
    );

  return `${translationType}

${namespaceTranslationsTypes.join(NEW_LINE + NEW_LINE)}`;
};

const createTranslationTypeEntry = (
  resultEntry: ParsedResult,
  jsDocInfo: JsDocInfos,
): string => {
  if (isParsedResultEntry(resultEntry)) {
    const { key, args, parentKeys } = resultEntry;

    const nestedKey = getNestedKey(key, parentKeys);
    const jsDocString = createJsDocsString(jsDocInfo[nestedKey] as JsDocInfo, true, false, true);
    const translationType = generateTranslationType(args);

    return `
	${jsDocString}${wrapObjectKeyIfNeeded(key)}: ${translationType}`;
  }

  return processNestedParsedResult(resultEntry, (entry) =>
    createTranslationTypeEntry(entry, jsDocInfo),
  );
};

const getFormatterType = (formatter: TransformParameterPart): string => {
  if (formatter.kind === "formatter") return formatter.name;

  const cases = (formatter.raw || "")
    .replace(REGEX_BRACKETS, "")
    .split(",")
    .map((part) => part.split(":"))
    .map(([key]) => [key, "${string}"])
    .map((part) => part.join(":"))
    .join(",");

  return `{${cases}}`;
};

const generateTranslationType = (args: Arg[] = []): string => {
  const argStrings = args
    .filter(({ pluralOnly }) => !pluralOnly)
    .map(({ key, optional, transforms }) =>
      serializeMessageWithoutTypes([
        createParameterPart({
          k: key,
          i: "",
          n: optional,
          f: transforms.map(getFormatterType),
        }),
      ]).replace(REGEX_BRACKETS, ""),
    );

  const containsOptionalParams = args.some(({ optional }) => optional);
  if (!containsOptionalParams) return getParamsType(argStrings);

  const permutations = getArgumentVariations(argStrings);

  const containsRequiredParams = args.some(({ optional }) => !optional);
  if (!containsRequiredParams) permutations.push([]);

  return [...new Set(permutations.map(getParamsType))].join(PIPE_SEPARATION);
};

const getParamsType = (argStrings: string[]) =>
  argStrings.length
    ? `RequiredParams<${argStrings.map((arg) => getWrappedString(arg, true)).join(PIPE_SEPARATION)}>`
    : "string";

const REGEX_IS_OPTIONAL_PARAM = /((\?\s?$)|(\?\s?\|))/;

const getArgumentVariations = (argStrings: string[]): string[][] => {
  if (!argStrings.length) return [];

  const optionals = argStrings.filter((arg) => REGEX_IS_OPTIONAL_PARAM.test(arg));

  const mappings = optionals.map((optional) => {
    const index = argStrings.findIndex((arg) => arg === optional);
    if (index === -1) return [];
    return getArgumentVariations([
      ...argStrings.slice(0, index),
      ...argStrings.slice(index + 1),
    ]);
  });

  return [argStrings, ...mappings.flat()];
};
