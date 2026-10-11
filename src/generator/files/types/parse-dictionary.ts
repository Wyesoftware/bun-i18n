import {
  isParameterPart,
  isPluralPart,
  parseMessage,
} from "../../../parser/advanced/parse";
import { serializeMessageWithoutTypes } from "../../../parser/advanced/serialize";
import type { AnyBaseTranslation } from "../../../runtime/core";
import type { Arg, ParsedResult, ParsedResultEntry, Types } from "../../types";
import type { Logger } from "../../utils/logger";

const isObjectLike = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

/**
 * Walks the base translation and parses every string into its arguments and
 * types. Invalid translations are reported through the logger and skipped.
 */
export const parseDictionary = (
  translations: AnyBaseTranslation,
  logger: Logger,
  parentKeys: string[] = [],
): ParsedResult[] =>
  isObjectLike(translations)
    ? Object.entries(translations)
        .map(([key, text]): ParsedResult | null =>
          typeof text === "string"
            ? parseTranslationEntry(key, text, logger, parentKeys)
            : { [key]: parseDictionary(text, logger, [...parentKeys, key]) },
        )
        .filter((entry): entry is ParsedResult => entry !== null)
    : [];

const parseTranslationEntry = (
  key: string,
  text: string,
  logger: Logger,
  parentKeys: string[],
): ParsedResultEntry | null => {
  const parsedMessage = parseMessage(text);
  const textWithoutTypes = serializeMessageWithoutTypes(parsedMessage);

  const args: Arg[] = [];
  const typesMap: Types = {};

  for (const { key: argKey, optional, types, transforms } of parsedMessage.filter(
    isParameterPart,
  )) {
    args.push({ key: argKey, transforms, optional });

    typesMap[argKey] = {
      types: [...new Set([...(typesMap[argKey]?.types || []), ...types])].filter(
        (type) => type !== undefined,
      ),
      optional: typesMap[argKey]?.optional || optional,
    };
  }

  for (const { key: pluralKey } of parsedMessage.filter(isPluralPart)) {
    if (!typesMap[pluralKey]?.types.length && !args.some((arg) => arg.key === pluralKey)) {
      typesMap[pluralKey] = { types: ["number", "string", "boolean"] };
      // a plural without a matching argument still needs a value
      args.push({ key: pluralKey, transforms: [], pluralOnly: true });
    }
  }

  args.sort((a, b) => a.key.localeCompare(b.key));

  if (!validateTranslation(key, typesMap, logger)) return null;

  return { key, text, textWithoutTypes, args, types: typesMap, parentKeys };
};

const validateTranslation = (key: string, types: Types, logger: Logger): boolean => {
  const base = `translation '${key}' =>`;

  if (key.includes(".")) {
    logger.error(
      `${base} key can't contain the '.' character. Please remove it. If you want to nest keys, you should look at https://github.com/Wyesoftware/bun-i18n#nested-translations`,
    );
    return false;
  }

  const argKeys = Object.keys(types).sort();
  const [firstKey] = argKeys;
  if (firstKey !== undefined && !Number.isNaN(+firstKey)) {
    let expectedKey = "0";
    for (const argKey of argKeys) {
      if (argKey !== expectedKey) {
        const info = Number.isNaN(+argKey)
          ? "You can't mix keyed and index-based arguments."
          : "Make sure to not skip an index for your arguments.";

        logger.error(`${base} argument {${expectedKey}} expected, but {${argKey}} found.`, info);
        return false;
      }
      expectedKey = (+argKey + 1).toString();
    }
  }

  return true;
};
