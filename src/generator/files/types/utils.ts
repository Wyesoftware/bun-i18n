import { NEW_LINE, NEW_LINE_INDENTED } from "../../constants";
import {
  isParsedResultEntry,
  type ParsedResult,
  type ParsedResultEntry,
} from "../../types";
import { wrapObjectKeyIfNeeded } from "../../utils/generator";

export const getNestedKey = (key: string, parentKeys: string[]): string =>
  [...parentKeys, key].join(".");

export const mapToString = <T>(
  items: T[],
  mappingFunction: (item: T) => string,
): string => items.map(mappingFunction).join("");

export const wrapObjectType = <T>(array: T[], callback: () => string): string =>
  !array.length
    ? "{}"
    : `{${callback()}
}`;

export const wrapUnionType = (array: string[]): string =>
  !array.length ? " never" : createUnionType(array);

const createUnionType = (entries: string[]) =>
  mapToString(
    entries,
    (locale) => `
	| '${locale}'`,
  );

export const flattenToParsedResultEntry = (
  parsedResults: ParsedResult[],
): ParsedResultEntry[] =>
  parsedResults.flatMap((parsedResult) =>
    isParsedResultEntry(parsedResult)
      ? parsedResult
      : Object.values(parsedResult).flatMap((nested) =>
          flattenToParsedResultEntry(nested),
        ),
  );

export const processNestedParsedResult = (
  items: Exclude<ParsedResult, ParsedResultEntry>,
  mappingFunction: (item: ParsedResult) => string,
): string =>
  NEW_LINE_INDENTED +
  mapToString(
    Object.entries(items),
    ([key, parsedResults]) =>
      `${wrapObjectKeyIfNeeded(key)}: {${mapToString(parsedResults, mappingFunction)
        .split(/\r?\n/)
        .map((line) => `	${line}`)
        .join(NEW_LINE)}
	}`,
  );
