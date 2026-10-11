import type { Locale } from "../../runtime/core";
import type { LocaleDetector } from "../detect";

/**
 * Creates a detector that reads the query parameter named `key` from
 * `location.search` (e.g. `?lang=de`). Returns `[]` when running outside a browser.
 */
export const initQueryStringDetector =
  (key = "lang"): LocaleDetector =>
  (): Locale[] => {
    if (typeof location === "undefined" || !location.search) return [];

    const value = new URLSearchParams(location.search).get(key);

    return value ? [value] : [];
  };

/** Reads the `lang` query parameter from `location.search`. */
export const queryStringDetector = initQueryStringDetector();
