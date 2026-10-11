import type { Locale } from "../runtime/core";

/**
 * A function that returns a list of locale candidates, ordered by preference.
 * Detectors are called without arguments; use an `init*` factory to bind
 * request-specific data.
 */
export type LocaleDetector = () => string[];

/**
 * Picks the first available locale found by the given detectors, falling back
 * to `baseLocale` when no detector finds a match.
 *
 * Matching is case-insensitive and also tries the language part of a
 * region-specific tag (e.g. `en-US` also matches `en`).
 */
export const detectLocale = <L extends Locale>(
  baseLocale: L,
  availableLocales: L[],
  ...detectors: LocaleDetector[]
): L => {
  for (const detector of detectors) {
    const found = findMatchingLocale(availableLocales, detector);
    if (found !== undefined) return found;
  }

  return baseLocale;
};

const findMatchingLocale = <L extends Locale>(
  availableLocales: L[],
  detector: LocaleDetector,
): L | undefined => {
  const detectedLocales = detector().map((locale) => locale.toLowerCase());
  // also include locales without country code e.g. if only 'en-US' is detected, we should also look for 'en'
  const localesToMatch = [
    ...new Set(
      detectedLocales.flatMap((locale) => [locale, locale.split("-")[0] ?? locale]),
    ),
  ];

  const lowercasedLocales = availableLocales.map((locale) => locale.toLowerCase());

  for (const locale of localesToMatch) {
    const matchedIndex = lowercasedLocales.indexOf(locale);
    if (matchedIndex >= 0) return availableLocales[matchedIndex];
  }

  return undefined;
};
