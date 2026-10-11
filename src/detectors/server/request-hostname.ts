import type { Locale } from "../../runtime/core";
import type { LocaleDetector } from "../detect";

/**
 * Either a Web `Request` (hostname is taken from `url`) or an express-style
 * object exposing `hostname` directly.
 */
export type RequestWithHostname = { hostname: string | null | undefined } | { url: string };

// matches language tags as per RFC 5646
const REGEX_HOST_LANG =
  /^((?:\w{2,3}(?:-\w{3})?)(?:-\w{4})?(?:-\w{2}|-\d{3})?(?:-[\w\d]{5,8}|-\d[\w\d]{3})*)\./;

const getHostname = (req: RequestWithHostname): string | null | undefined => {
  if ("hostname" in req) return req.hostname;

  try {
    return new URL(req.url).hostname;
  } catch {
    return undefined;
  }
};

/**
 * Creates a detector that reads the locale from the leading subdomain of the
 * request's hostname (e.g. `fr.example.com` or `fr-CA.example.com`).
 */
export const initRequestHostnameDetector =
  (req: RequestWithHostname): LocaleDetector =>
  (): Locale[] => {
    const match = getHostname(req)?.match(REGEX_HOST_LANG);
    const locale = match?.[1];

    return locale ? [locale] : [];
  };
