import type { Locale } from "../../runtime/core";
import type { LocaleDetector } from "../detect";

/** Anything with a `Headers`-like `get`, e.g. the Web `Request` from `Bun.serve`. */
export type RequestWithHeaders = {
  headers: { get: (key: string) => string | null | undefined };
};

const REGEX_ACCEPT_LANGUAGE_SPLIT = /[;,]/;

/**
 * Creates a detector that parses the `Accept-Language` header of a request
 * (e.g. `fr-CH, fr;q=0.9, en;q=0.8, *;q=0.5` → `["fr-CH", "fr", "en"]`).
 * Quality weights are ignored; order is preserved and `*` is dropped.
 */
export const initAcceptLanguageHeaderDetector =
  ({ headers }: RequestWithHeaders, headerKey = "accept-language"): LocaleDetector =>
  (): Locale[] =>
    (headers.get(headerKey) ?? "")
      .split(REGEX_ACCEPT_LANGUAGE_SPLIT)
      .map((part) => part.trim())
      .filter((part) => part !== "" && part !== "*" && !part.startsWith("q="));
