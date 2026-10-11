import type { FormatterFunction } from "../runtime/core";

/**
 * Creates a formatter that renders numbers with `Intl.NumberFormat`.
 *
 * @example number("en", { style: "currency", currency: "USD" })
 */
export const number = (
  locale: string,
  options: Intl.NumberFormatOptions = {},
): FormatterFunction<number | bigint, string> => {
  const formatter = new Intl.NumberFormat(locale, options);
  return (value) => formatter.format(value);
};
