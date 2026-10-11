import type { FormatterFunction } from "../runtime/core";

/**
 * Creates a formatter that renders dates with `Intl.DateTimeFormat`.
 *
 * @example date("en", { month: "long", day: "numeric" })
 */
export const date = (
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): FormatterFunction<number | Date | undefined, string> => {
  const formatter = new Intl.DateTimeFormat(locale, options);
  return (value) => formatter.format(value);
};
