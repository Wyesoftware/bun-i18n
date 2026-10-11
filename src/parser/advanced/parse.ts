import {
  REGEX_SWITCH_CASE,
  isBasicPluralPart,
  parseCases,
  parseRawText,
  type BasicArgumentPart,
  type BasicPart,
  type BasicPluralPart,
} from "../basic";
import type {
  ParameterPart,
  ParsedMessage,
  ParsedMessagePart,
  PluralPart,
  TextPart,
  TransformParameterFormatterPart,
  TransformParameterPart,
  TransformParameterSwitchCasePart,
} from "./types";
import { isNotUndefined, uniqueArray } from "./utils";

// type guards ---------------------------------------------------------------

export const isTextPart = (part: ParsedMessagePart): part is TextPart =>
  part.kind === "text";

export const isPluralPart = (part: ParsedMessagePart): part is PluralPart =>
  part.kind === "plural";

export const isParameterPart = (
  part: ParsedMessagePart,
): part is ParameterPart => part.kind === "parameter";

export const isTransformParameterFormatterPart = (
  part: TransformParameterPart,
): part is TransformParameterFormatterPart => part.kind === "formatter";

export const isTransformParameterSwitchCasePart = (
  part: TransformParameterPart,
): part is TransformParameterSwitchCasePart => part.kind === "switch-case";

// parsing -------------------------------------------------------------------

/**
 * Parses a translation string into a self-describing AST.
 *
 * Builds on top of the basic runtime parser and then enriches every parameter
 * with type information inferred from other occurrences of the same key,
 * switch-case statements and plural usage.
 *
 * @example parseMessage("Hi {name:string|upper}") // text + parameter part
 */
// TODO: use a dedicated parsing strategy instead of re-using `parseRawText` so that `raw` can be provided for every part
export const parseMessage = (message: string): ParsedMessage =>
  enhanceTypeInformation(
    parseRawText(message, false).map(createPart).filter(isNotUndefined),
  );

const createPart = (part: BasicPart): ParsedMessagePart | undefined => {
  if (typeof part === "string") {
    // empty strings (e.g. between two adjacent placeholders) produce no part
    return part ? createTextPart(part) : undefined;
  }

  if (isBasicPluralPart(part)) return createPluralPart(part);

  return createParameterPart(part);
};

const createTextPart = (content: string): TextPart => ({
  kind: "text",
  content,
});

const createPluralPart = ({
  k,
  z,
  o,
  t,
  f,
  m,
  r,
}: BasicPluralPart): PluralPart => ({
  kind: "plural",
  key: k,
  ...(z ? { zero: z } : undefined),
  ...(o ? { one: o } : undefined),
  ...(t ? { two: t } : undefined),
  ...(f ? { few: f } : undefined),
  ...(m ? { many: m } : undefined),
  other: r,
});

/**
 * Converts a basic argument part into a `ParameterPart`.
 * Exported because the generator uses it to build type strings for parameters.
 */
export const createParameterPart = ({
  k,
  i,
  n,
  f,
}: BasicArgumentPart): ParameterPart => ({
  kind: "parameter",
  key: k,
  types: i ? [i] : [],
  optional: n || false,
  transforms: (f || []).map(createTransformParameterPart),
});

const createTransformParameterPart = (
  transform: string,
): TransformParameterPart =>
  transform.match(REGEX_SWITCH_CASE)
    ? {
        kind: "switch-case",
        cases: Object.entries(parseCases(transform)).map(([key, value]) => ({
          key,
          value,
        })),
        raw: transform,
      }
    : {
        kind: "formatter",
        name: transform,
      };

// type inference ------------------------------------------------------------

type TypeInfo = { types: string[]; optional: boolean };

/**
 * Merges type information across all occurrences of a parameter key.
 *
 * - explicit types (`{a:string}`) are collected per key
 * - a leading switch-case statement contributes string-literal types
 * - keys that are used in a plural part but have no type get `string | number | boolean`
 * - keys without any type information get `unknown`
 *
 * Note: only the first parameter part of each key is updated with the merged
 * result; later occurrences keep the information they were parsed with.
 */
const enhanceTypeInformation = (parts: ParsedMessage): ParsedMessage => {
  const parameterParts = parts.filter(isParameterPart);
  const pluralParts = parts.filter(isPluralPart);

  const typeMap: Record<string, TypeInfo> = {};

  parameterParts.forEach(({ key, types, transforms, optional }) => {
    const enhancedTypes = types.length
      ? types
      : parseTypesFromSwitchCaseStatement(transforms);
    typeMap[key] = {
      types: uniqueArray([
        ...(typeMap[key]?.types || []),
        ...enhancedTypes,
      ]).filter(isNotUndefined),
      optional: typeMap[key]?.optional || optional,
    };
  });

  pluralParts.forEach(({ key }) => {
    if (!typeMap[key]?.types.length) {
      // a key without types that drives a plural accepts anything a plural rule can handle
      typeMap[key] = { types: ["string", "number", "boolean"], optional: false };
    }
  });

  Object.keys(typeMap).forEach((key) => {
    if (!typeMap[key]?.types.length) {
      typeMap[key] = {
        types: ["unknown"],
        optional: typeMap[key]?.optional || false,
      };
    }
  });

  Object.entries(typeMap).forEach(([key, value]) => {
    const part = parameterParts.find((p) => p.key === key);
    if (!part) return;

    part.types = value.types;
    part.optional = part.optional || value.optional;
  });

  return parts;
};

/** Matches a leading `{` or a trailing `}`; used by the generator to unwrap a serialized parameter. */
export const REGEX_BRACKETS = /(^{)|(}$)/g;

/**
 * Derives string-literal types from a switch-case statement, e.g.
 * `{male: his, female: her, *: their}` => `["'male'", "'female'", "string"]`.
 * Only the first transform is considered.
 */
const parseTypesFromSwitchCaseStatement = (
  transforms: TransformParameterPart[],
): string[] => {
  const [first] = transforms;
  if (!first || !isTransformParameterSwitchCasePart(first)) return [];

  return first.cases.map(({ key }) => (key === "*" ? "string" : `'${key}'`));
};
