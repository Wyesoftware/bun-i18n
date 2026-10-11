import {
  isBasicPluralPart,
  parseCases,
  REGEX_SWITCH_CASE,
  type BasicArgumentPart,
  type BasicPart,
  type BasicPluralPart,
} from "../parser/basic";
import type { Args } from "./args";

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

export type Locale = string;

// biome-ignore lint/suspicious/noExplicitAny: arguments are validated at the type level by `Args`
export type Arguments = any[];

declare const localized: unique symbol;
/** A string that went through a translation function. */
export type LocalizedString = string & { readonly [localized]: unknown };

/** Parsed parts of every translation, keyed by the raw translation string. */
export type Cache = Record<string, BasicPart[]>;

type TranslationValue =
  | string
  | BaseTranslation
  | BaseTranslation[]
  | Readonly<string>
  | Readonly<BaseTranslation>
  | Readonly<BaseTranslation[]>;

export type BaseTranslation =
  | { [key: number]: TranslationValue }
  | { [key: string]: TranslationValue }
  | string[]
  | Readonly<string[]>;

export type AnyBaseTranslation =
  | BaseTranslation
  | BaseTranslation[]
  | Readonly<BaseTranslation>
  | Readonly<BaseTranslation[]>;

export type BaseTranslationFunction = (...args: Arguments) => LocalizedString;

/** Translation functions without argument validation (used by generated types). */
export type TranslationFunctions<
  T extends AnyBaseTranslation = BaseTranslation,
> = {
  [key in keyof T]: T[key] extends string
    ? BaseTranslationFunction
    : // biome-ignore lint/suspicious/noExplicitAny: nested translation objects
      T[key] extends Record<any, any>
      ? TranslationFunctions<T[key]>
      : never;
};

export type TypedTranslationFunction<
  Translation extends string,
  Formatters extends BaseFormatters,
> = (...args: Args<Translation, keyof Formatters>) => LocalizedString;

/**
 * Translation functions whose arguments are derived from the translation
 * string itself. Typing is preserved on every nesting level.
 */
export type TypedTranslationFunctions<
  T extends AnyBaseTranslation = BaseTranslation,
  Formatters extends BaseFormatters = BaseFormatters,
> = {
  [key in keyof T]: T[key] extends string
    ? TypedTranslationFunction<T[key], Formatters>
    : // biome-ignore lint/suspicious/noExplicitAny: nested translation objects
      T[key] extends Record<any, any>
      ? TypedTranslationFunctions<T[key], Formatters>
      : never;
};

export type LocaleTranslations<L extends Locale, T = unknown> = {
  [key in L]: T;
};

// biome-ignore lint/suspicious/noExplicitAny: formatters accept whatever the translation passes in
export type FormatterFunction<T = any, U = unknown> = (value: T) => U;

export type BaseFormatters = {
  [formatter: string]: FormatterFunction;
};

export type FormattersInitializer<
  L extends Locale,
  F extends BaseFormatters,
> = (locale: L) => F;

// ---------------------------------------------------------------------------
// implementation
// ---------------------------------------------------------------------------

const applyFormatters = (
  formatters: BaseFormatters,
  formatterKeys: string[],
  initialValue: unknown,
): unknown =>
  formatterKeys.reduce<unknown>(
    (value, formatterKey) =>
      (formatterKey.match(REGEX_SWITCH_CASE)
        ? ((cases) => cases[value as string] ?? cases["*"])(
            parseCases(formatterKey),
          )
        : formatters[formatterKey]?.(value)) ?? value,
    initialValue,
  );

const getPlural = (
  pluralRules: Intl.PluralRules,
  { z, o, t, f, m, r }: BasicPluralPart,
  value: unknown,
): string | undefined => {
  switch (z && value == 0 ? "zero" : pluralRules.select(value as number)) {
    case "zero":
      return z;
    case "one":
      return o;
    case "two":
      return t;
    case "few":
      return f ?? r;
    case "many":
      return m ?? r;
    default:
      return r;
  }
};

const REGEX_PLURAL_VALUE_INJECTION = /\?\?/g;

const applyArguments = (
  textParts: BasicPart[],
  pluralRules: Intl.PluralRules,
  formatters: BaseFormatters,
  args: Arguments,
): LocalizedString =>
  textParts
    .map((part) => {
      if (typeof part === "string") return part;

      const { k: key = "0", f: formatterKeys = [] } = part as BasicArgumentPart;
      const value = args[key as unknown as number] as unknown;

      if (isBasicPluralPart(part)) {
        const text =
          typeof value === "boolean"
            ? value
              ? part.o
              : part.r
            : getPlural(pluralRules, part, value);
        return (text || "").replace(
          REGEX_PLURAL_VALUE_INJECTION,
          value as string,
        );
      }

      const formattedValue = formatterKeys.length
        ? applyFormatters(formatters, formatterKeys, value)
        : value;

      return `${formattedValue ?? ""}`.trim();
    })
    .join("") as LocalizedString;

/**
 * Renders parsed translation parts with the given arguments.
 * A single plain-object argument is treated as a keyed argument map,
 * anything else as positional arguments.
 */
export const translate = (
  textParts: BasicPart[],
  pluralRules: Intl.PluralRules,
  formatters: BaseFormatters,
  args: Arguments,
): LocalizedString => {
  const firstArg: unknown = args[0];
  const isObject =
    !!firstArg &&
    typeof firstArg === "object" &&
    firstArg.constructor === Object;
  const transformedArgs = (
    args.length === 1 && isObject ? firstArg : args
  ) as Arguments;

  return applyArguments(textParts, pluralRules, formatters, transformedArgs);
};
