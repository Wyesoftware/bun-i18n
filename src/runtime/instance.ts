import type {
  AnyBaseTranslation,
  BaseFormatters,
  Locale,
  TranslationFunctions,
} from "./core";
import { i18nObject } from "./object";

export type LocaleTranslationFunctions<
  L extends Locale = Locale,
  T extends AnyBaseTranslation = AnyBaseTranslation,
  TF extends TranslationFunctions<T> = TranslationFunctions<T>,
> = {
  [key in L]: TF;
};

/**
 * Creates a lazily populated map of locale → translation functions:
 * `L.en.greeting()`, `L.de.greeting()`.
 */
export const i18n = <
  L extends Locale,
  T extends AnyBaseTranslation,
  TF extends TranslationFunctions<T> = TranslationFunctions<T>,
  F extends BaseFormatters = BaseFormatters,
>(
  translations: Record<L, T>,
  formatters: Partial<Record<L, F>> = {},
): LocaleTranslationFunctions<L, T, TF> => {
  const cache = {} as Record<L, TF>;

  return new Proxy({} as LocaleTranslationFunctions<L, T, TF>, {
    get: (_target, locale: string): TF =>
      (cache[locale as L] ??= i18nObject<L, T, TF, F>(
        locale as L,
        translations[locale as L],
        formatters[locale as L],
      )),
  });
};
