import type { Locale } from "../../runtime/core";
import { parseValueFromCookie } from "../cookie";
import type { LocaleDetector } from "../detect";

/**
 * Creates a detector that reads the cookie named `key` from `document.cookie`.
 * Only non-`HttpOnly` cookies are visible to this detector.
 */
export const initDocumentCookieDetector =
  (key = "lang"): LocaleDetector =>
  (): Locale[] =>
    typeof document === "undefined" ? [] : parseValueFromCookie(document.cookie, key);

/** Reads the `lang` cookie from `document.cookie`. */
export const documentCookieDetector = initDocumentCookieDetector();
