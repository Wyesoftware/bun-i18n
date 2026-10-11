export type {
  Args,
  DetectType,
  RequiredParams,
  UnknownFormatter,
} from "./runtime/args";
export type {
  AnyBaseTranslation,
  Arguments,
  BaseFormatters,
  BaseTranslation,
  BaseTranslationFunction,
  FormatterFunction,
  FormattersInitializer,
  Locale,
  LocaleTranslations,
  LocalizedString,
  TranslationFunctions,
  TypedTranslationFunction,
  TypedTranslationFunctions,
} from "./runtime/core";
export { getFallbackProxy } from "./runtime/fallback";
export { i18n, type LocaleTranslationFunctions } from "./runtime/instance";
export { i18nObject, typesafeI18nObject } from "./runtime/object";
export {
  i18nString,
  typesafeI18nString,
  type TranslateByString,
  type TypesafeTranslateByString,
} from "./runtime/string";
