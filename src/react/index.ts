import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Context,
  type FunctionComponent,
  type ReactNode,
} from "react";
import type {
  AnyBaseTranslation,
  BaseFormatters,
  Locale,
  TranslationFunctions,
} from "../runtime/core";
import { getFallbackProxy } from "../runtime/fallback";
import { i18nObject } from "../runtime/object";

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

export type I18nContextType<
  L extends Locale = Locale,
  T extends AnyBaseTranslation = AnyBaseTranslation,
  TF extends TranslationFunctions<T> = TranslationFunctions<T>,
> = {
  locale: L;
  LL: TF;
  setLocale: (locale: L) => void;
};

export type TypesafeI18nProps<L extends Locale> = {
  locale: L;
  children?: ReactNode;
};

export type ReactInit<
  L extends Locale = Locale,
  T extends AnyBaseTranslation = AnyBaseTranslation,
  TF extends TranslationFunctions<T> = TranslationFunctions<T>,
> = {
  /** Provider component; wrap your application with it. */
  component: FunctionComponent<TypesafeI18nProps<L>>;
  /** The underlying React context. */
  context: Context<I18nContextType<L, T, TF>>;
  /** Hook returning `{ locale, LL, setLocale }` of the nearest provider. */
  useI18nContext: () => I18nContextType<L, T, TF>;
};

// ---------------------------------------------------------------------------
// implementation
// ---------------------------------------------------------------------------

/**
 * Creates a React provider and context bound to the given translations.
 * Translations and formatters are looked up by locale, so load them before
 * rendering the provider (or switch with `setLocale` once loaded).
 */
export const initI18nReact = <
  L extends Locale = Locale,
  T extends AnyBaseTranslation = AnyBaseTranslation,
  TF extends TranslationFunctions<T> = TranslationFunctions<T>,
  F extends BaseFormatters = BaseFormatters,
>(
  translations: Record<L, T>,
  formatters: Partial<Record<L, F>> = {},
): ReactInit<L, T, TF> => {
  const context = createContext({} as I18nContextType<L, T, TF>);

  const createLL = (locale: L): TF =>
    locale
      ? i18nObject<L, T, TF, F>(locale, translations[locale], formatters[locale])
      : getFallbackProxy<TF>();

  const component: FunctionComponent<TypesafeI18nProps<L>> = (props) => {
    const [locale, setLocaleState] = useState<L>(props.locale);
    const [LL, setLL] = useState<TF>(() => createLL(props.locale));

    const setLocale = useCallback((newLocale: L) => {
      setLocaleState(newLocale);
      setLL(() => createLL(newLocale));
    }, []);

    const value = useMemo<I18nContextType<L, T, TF>>(
      () => ({ locale, LL, setLocale }),
      [locale, LL, setLocale],
    );

    return createElement(context.Provider, { value }, props.children);
  };
  component.displayName = "TypesafeI18n";

  const useI18nContext = () => useContext(context);

  return { component, context, useI18nContext };
};
