import type { Locale } from "../../runtime/core";
import type { LocaleDetector } from "../detect";

/**
 * Anything exposing route parameters as `params`, e.g. `BunRequest` from
 * `Bun.serve` routes or an express `Request`.
 */
export type RequestWithParams = {
  params: Readonly<Record<string, string | undefined>> | null | undefined;
};

/**
 * Creates a detector that reads the route parameter named `key`
 * (e.g. `/:lang/products`) from `req.params`.
 */
export const initRequestParametersDetector =
  (req: RequestWithParams, key = "lang"): LocaleDetector =>
  (): Locale[] => {
    const value = req.params?.[key];

    return value ? [value] : [];
  };
