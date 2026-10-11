import type { Locale } from "../../runtime/core";
import type { LocaleDetector } from "../detect";

/**
 * Creates a detector that reads the item named `key` from `sessionStorage`.
 * Returns `[]` when `sessionStorage` is unavailable.
 */
export const initSessionStorageDetector =
  (key = "lang"): LocaleDetector =>
  (): Locale[] => {
    if (typeof sessionStorage === "undefined") return [];

    const value = sessionStorage.getItem(key);

    return value ? [value] : [];
  };

/** Reads the `lang` item from `sessionStorage`. */
export const sessionStorageDetector = initSessionStorageDetector();
