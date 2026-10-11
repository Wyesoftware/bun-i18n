import type { Locale } from "../../runtime/core";
import type { LocaleDetector } from "../detect";

/**
 * Creates a detector that reads the item named `key` from `localStorage`.
 * Returns `[]` when `localStorage` is unavailable.
 */
export const initLocalStorageDetector =
  (key = "lang"): LocaleDetector =>
  (): Locale[] => {
    if (typeof localStorage === "undefined") return [];

    const value = localStorage.getItem(key);

    return value ? [value] : [];
  };

/** Reads the `lang` item from `localStorage`. */
export const localStorageDetector = initLocalStorageDetector();
