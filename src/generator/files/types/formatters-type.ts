import { isTransformParameterFormatterPart } from "../../../parser/advanced/parse";
import type { ParsedResult } from "../../types";
import { wrapObjectKeyIfNeeded } from "../../utils/generator";
import { flattenToParsedResultEntry, mapToString, wrapObjectType } from "./utils";

const getUniqueFormatters = (
  parsedTranslations: ParsedResult[],
): [string, string[]][] => {
  const map: Record<string, string[]> = {};

  for (const { types, args = [] } of flattenToParsedResultEntry(parsedTranslations)) {
    for (const { key, transforms } of args) {
      for (const { name } of transforms.filter(isTransformParameterFormatterPart)) {
        map[name] = [...(map[name] || []), ...(types[key]?.types || [])];
      }
    }
  }

  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
};

/** `export type Formatters = { name: (value: T) => unknown }` */
export const createFormattersType = (parsedTranslations: ParsedResult[]): string => {
  const formatters = getUniqueFormatters(parsedTranslations);

  return `export type Formatters = ${wrapObjectType(formatters, () =>
    mapToString(
      formatters,
      ([key, types]) =>
        `
	${wrapObjectKeyIfNeeded(key)}: (value: ${[...new Set(types)].join(" | ")}) => unknown`,
    ),
  )}`;
};
