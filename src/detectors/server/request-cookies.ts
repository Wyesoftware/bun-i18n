import type { Locale } from "../../runtime/core";
import { parseValueFromCookie } from "../cookie";
import type { LocaleDetector } from "../detect";
import type { RequestWithHeaders } from "./accept-language-header";

/**
 * Either a Web `Request` (the `Cookie` header is read via `headers.get`) or an
 * express-style object exposing the raw cookie string as `cookies`.
 */
export type RequestWithCookies = RequestWithHeaders | { cookies: string | null | undefined };

const getCookieHeader = (req: RequestWithCookies): string | null | undefined =>
  "headers" in req ? req.headers.get("cookie") : req.cookies;

/**
 * Creates a detector that reads the cookie named `key` from a request's
 * `Cookie` header.
 */
export const initRequestCookiesDetector =
  (req: RequestWithCookies, key = "lang"): LocaleDetector =>
  (): Locale[] =>
    parseValueFromCookie(getCookieHeader(req), key);
