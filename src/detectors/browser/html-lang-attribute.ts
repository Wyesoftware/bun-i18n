import type { Locale } from "../../runtime/core";
import type { LocaleDetector } from "../detect";

/**
 * Reads the `lang` attribute of the `<html>` element
 * (`document.documentElement.lang`). Returns `[]` when running outside a browser.
 */
export const htmlLangAttributeDetector: LocaleDetector = (): Locale[] => {
  if (typeof document === "undefined") return [];

  const lang = document.documentElement?.lang;

  return lang ? [lang] : [];
};
