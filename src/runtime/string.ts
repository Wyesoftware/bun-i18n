import { parseRawText, type BasicPart } from "../parser/basic";
import type { Args } from "./args";
import {
  translate,
  type Arguments,
  type BaseFormatters,
  type Cache,
  type Locale,
  type LocalizedString,
} from "./core";

export type TranslateByString = (
  text: string,
  ...args: Arguments
) => LocalizedString;

// `NoInfer` keeps TypeScript from trying to infer `Translation` through the
// argument types, which otherwise blows up the type-level parser.
export type TypesafeTranslateByString<F extends BaseFormatters> = <
  Translation extends string,
>(
  text: Translation,
  ...args: NoInfer<Args<Translation, keyof F>>
) => LocalizedString;

export const getPartsFromString = (cache: Cache, text: string): BasicPart[] =>
  cache[text] ?? (cache[text] = parseRawText(text));

const createTranslateString = (
  locale: Locale,
  formatters: BaseFormatters,
): TranslateByString => {
  const cache: Cache = {};
  const pluralRules = new Intl.PluralRules(locale);
  return (text, ...args) =>
    translate(getPartsFromString(cache, text), pluralRules, formatters, args);
};

/**
 * Creates a function that translates raw strings:
 * `LLL('Hi {name}', { name: 'John' })`.
 */
export const i18nString = <L extends Locale, F extends BaseFormatters>(
  locale: L,
  formatters: F = {} as F,
): TranslateByString => createTranslateString(locale, formatters);

/**
 * Like {@link i18nString} but the arguments are validated against the
 * translation string at compile time.
 */
export const typesafeI18nString = <
  L extends Locale,
  F extends BaseFormatters = Record<never, never>,
>(
  locale: L,
  formatters: F = {} as F,
): TypesafeTranslateByString<F> =>
  createTranslateString(locale, formatters) as TypesafeTranslateByString<F>;
