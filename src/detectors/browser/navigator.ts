import type { Locale } from "../../runtime/core";
import type { LocaleDetector } from "../detect";

/**
 * Reads the browser's preferred languages from `navigator.languages`.
 * Returns `[]` when running outside a browser.
 */
export const navigatorDetector: LocaleDetector = (): Locale[] =>
  typeof navigator !== "undefined" && Array.isArray(navigator.languages)
    ? [...navigator.languages]
    : [];
