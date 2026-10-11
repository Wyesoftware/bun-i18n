import {
  translate,
  type AnyBaseTranslation,
  type Arguments,
  type BaseFormatters,
  type BaseTranslation,
  type Cache,
  type Locale,
  type LocalizedString,
  type TranslationFunctions,
  type TypedTranslationFunctions,
} from "./core";
import { getPartsFromString } from "./string";

type TranslateFn = (text: string, ...args: Arguments) => LocalizedString;

const getTranslateInstance = (
  locale: Locale,
  formatters: BaseFormatters,
): TranslateFn => {
  const cache: Cache = {};
  const pluralRules = new Intl.PluralRules(locale);
  return (text, ...args) =>
    translate(getPartsFromString(cache, text), pluralRules, formatters, args);
};

// `name` and `length` are read-only on functions; make them writable so
// translation keys with those names can be assigned onto the target.
const createTarget = (): object =>
  Object.defineProperties(() => "", {
    name: { writable: true, value: "" },
    length: { writable: true, value: 0 },
  });

const wrap = (proxyObject: unknown, translateFn: TranslateFn): object =>
  typeof proxyObject === "string"
    ? translateFn.bind(null, proxyObject)
    : Object.assign(createTarget(), proxyObject ?? {});

const createProxy = (proxyObject: unknown, translateFn: TranslateFn): unknown =>
  new Proxy(wrap(proxyObject, translateFn), {
    get: (target, key) => {
      if (key === Symbol.iterator) {
        return [][Symbol.iterator].bind(
          Object.values(target).map((entry) => wrap(entry, translateFn)),
        );
      }
      return createProxy(
        (target as Record<PropertyKey, unknown>)[key],
        translateFn,
      );
    },
  });

/**
 * Wraps a translation object so that every leaf becomes a translation
 * function: `LL.greeting({ name: 'John' })`.
 */
export function i18nObject<
  L extends Locale,
  T extends AnyBaseTranslation,
  TF extends TranslationFunctions<T> = TranslationFunctions<T>,
  F extends BaseFormatters = BaseFormatters,
>(locale: L, translations: T, formatters?: F): TF;
export function i18nObject(
  locale: Locale,
  translations: AnyBaseTranslation,
  formatters: BaseFormatters = {},
): unknown {
  return createProxy(translations, getTranslateInstance(locale, formatters));
}

/**
 * Like {@link i18nObject} but every translation function validates its
 * arguments against the translation string. Pass the translations `as const`.
 */
export function typesafeI18nObject<
  L extends Locale,
  const T extends BaseTranslation | BaseTranslation[],
  F extends BaseFormatters = Record<never, never>,
>(locale: L, translations: T, formatters?: F): TypedTranslationFunctions<T, F>;
export function typesafeI18nObject(
  locale: Locale,
  translations: AnyBaseTranslation,
  formatters: BaseFormatters = {},
): unknown {
  return createProxy(translations, getTranslateInstance(locale, formatters));
}
