import type { BaseTranslation } from "../runtime/core";

/** Makes every nested translation key optional. */
export type DeepPartial<T> = T extends BaseTranslation
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/** Widens literal translation strings so overrides may use any text. */
export type ToGenericString<T> = T extends string
  ? string
  : T extends BaseTranslation
    ? { [P in keyof T]?: ToGenericString<T[P]> }
    : T;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Recursively merges `part` into a copy of `base`. Arrays are merged by index
 * and plain objects by key; every other value in `part` replaces the one in
 * `base`. Neither argument is mutated; `undefined` values in `part` are skipped.
 */
const deepMerge = (base: unknown, part: unknown): unknown => {
  if (Array.isArray(part)) {
    const result: unknown[] = Array.isArray(base) ? [...base] : [];
    part.forEach((value, index) => {
      result[index] = deepMerge(result[index], value);
    });
    return result;
  }
  if (isPlainObject(part)) {
    const result: Record<string, unknown> = isPlainObject(base)
      ? { ...base }
      : {};
    for (const key of Object.keys(part)) {
      const value = part[key];
      if (value !== undefined) result[key] = deepMerge(result[key], value);
    }
    return result;
  }
  return part;
};

/**
 * Creates an `extendDictionary` function bound to a translation type, so the
 * `part` argument is checked against the shape of that dictionary.
 */
export const initExtendDictionary =
  <TranslationType extends BaseTranslation>() =>
  <Base extends BaseTranslation | TranslationType, Translation extends Base>(
    base: Base,
    part: DeepPartial<ToGenericString<Translation>>,
  ): Translation =>
    deepMerge(base, part) as Translation;

/**
 * Returns a new dictionary with `part` deep-merged over `base`.
 * Useful for deriving a locale from another one (e.g. `en-GB` from `en`).
 */
export const extendDictionary = initExtendDictionary();
