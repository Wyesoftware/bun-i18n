import type { Locale } from "../runtime/core";

/**
 * Extracts the value of the cookie named `key` from a raw `Cookie` header /
 * `document.cookie` string (`a=1; lang=de; b=2`).
 */
export const parseValueFromCookie = (
  cookieValue: string | null | undefined,
  key: string,
): Locale[] => {
  if (!cookieValue) return [];

  const prefix = `${key}=`;
  const part = cookieValue
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(prefix));

  const value = part?.slice(prefix.length);

  return value ? [value] : [];
};
