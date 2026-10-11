// Basic parser: turns a raw translation string into a flat list of parts.
// This is the parser used at runtime, so it is kept small and allocation-light.
// Short property names (k, i, n, f, z, o, t, m, r) are intentional: the parsed
// parts are cached per translation and this keeps the runtime footprint minimal.

export type BasicTextPart = string;

export type BasicArgumentPart = {
  /** key */
  k: string;
  /** type */
  i?: string | undefined;
  /** non-mandatory (optional) */
  n?: boolean | undefined;
  /** formatter function keys, applied left to right */
  f?: string[] | undefined;
};

export type BasicPluralPart = {
  /** key */
  k: string;
  /** zero */
  z?: string | undefined;
  /** one */
  o: string;
  /** two */
  t?: string | undefined;
  /** few */
  f?: string | undefined;
  /** many */
  m?: string | undefined;
  /** other */
  r: string;
};

export type BasicPart = BasicTextPart | BasicArgumentPart | BasicPluralPart;

const removeEmptyValues = <T extends BasicArgumentPart | BasicPluralPart>(
  object: T,
): T =>
  Object.fromEntries(
    (Object.entries(object) as [string, unknown][]).filter(
      ([key, value]) => key !== "i" && !!value && value != "0",
    ),
  ) as T;

const trimAllValues = <T extends BasicArgumentPart | BasicPluralPart>(
  part: T,
): T =>
  Object.fromEntries(
    Object.keys(part).map((key) => {
      const value = part[key as keyof T] as unknown as
        | boolean
        | string
        | string[]
        | undefined;
      if (Array.isArray(value)) return [key, value.map((v) => v?.trim())];
      if (typeof value === "boolean") return [key, value];
      return [key, value?.trim()];
    }),
  ) as T;

const parseArgumentPart = (text: string): BasicArgumentPart => {
  const [keyPart = "", ...formatterKeys] = text.split("|");
  const [keyWithoutType = "", type] = keyPart.split(":");
  const [key, isOptional] = keyWithoutType.split("?") as [
    string,
    string | undefined,
  ];
  return { k: key, i: type, n: isOptional === "", f: formatterKeys };
};

export const isBasicPluralPart = (
  part: Exclude<BasicPart, string>,
): part is BasicPluralPart =>
  !!((part as BasicPluralPart).o || (part as BasicPluralPart).r);

const parsePluralPart = (
  content: string,
  lastAccessor: string,
): BasicPluralPart => {
  let [key = "", values] = content.split(":") as [string, string?];
  if (!values) {
    values = key;
    key = lastAccessor;
  }

  const entries = values.split("|");
  const [zero = "", one = "", two = "", few, many, rest = ""] = entries;

  switch (entries.length) {
    case 1:
      // `{{s}}`: nothing for "one", the given text for every other form
      return { k: key, r: zero } as BasicPluralPart;
    case 2:
      return { k: key, o: zero, r: one };
    case 3:
      return { k: key, z: zero, o: one, r: two };
    default:
      return { k: key, z: zero, o: one, t: two, f: few, m: many, r: rest };
  }
};

export const REGEX_SWITCH_CASE = /^\{.*\}$/;

export const removeOuterBrackets = (text: string): string =>
  text.substring(1, text.length - 1);

/**
 * Parses a switch-case formatter such as `{yes: Ja, no: Nein, *: ?}`.
 * Values may contain commas; the first `:` separates key and value.
 */
export const parseCases = (text: string): Record<string, string> =>
  Object.fromEntries(
    removeOuterBrackets(text)
      .split(",")
      .reduce<[string, string][]>((accumulator, chunk) => {
        const separator = chunk.indexOf(":");
        if (separator === -1) {
          // a comma was part of the previous value: glue it back together
          const previous = accumulator[accumulator.length - 1];
          if (previous) previous[1] += "," + chunk;
          return accumulator;
        }
        accumulator.push([
          chunk.slice(0, separator).trim(),
          chunk.slice(separator + 1).trim(),
        ]);
        return accumulator;
      }, []),
  );

// matches `{...}` and allows one level of nested braces (`{{...}}` and `{x|{a: b}}`)
const REGEX_BRACKETS_SPLIT = /(\{(?:[^{}]+|\{(?:[^{}]+)*\})*\})/g;

/**
 * Splits a translation string into text, argument and plural parts.
 *
 * @param rawText the translation string, e.g. `Hello {name:string|uppercase}!`
 * @param optimize drop type information and falsy values (runtime mode)
 * @param firstKey key used for plurals when no argument key was seen yet
 * @param lastKey key of the previously seen argument
 */
export const parseRawText = (
  rawText: string,
  optimize = true,
  firstKey = "",
  lastKey = "",
): BasicPart[] =>
  rawText
    .split(REGEX_BRACKETS_SPLIT)
    .map((part): BasicPart => {
      if (!part.match(REGEX_BRACKETS_SPLIT)) return part;

      const content = removeOuterBrackets(part);
      if (content.startsWith("{")) {
        return parsePluralPart(removeOuterBrackets(content), lastKey);
      }

      const parsedPart = parseArgumentPart(content);
      lastKey = parsedPart.k || lastKey;
      if (!firstKey) firstKey = lastKey;
      return parsedPart;
    })
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part.k) part.k = firstKey || "0";

      const trimmed = trimAllValues(part);
      return optimize ? removeEmptyValues(trimmed) : trimmed;
    });
