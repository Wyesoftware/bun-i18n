import type { FormatterFunction } from "../runtime/core";

/**
 * Creates a formatter that renders times with `Intl.DateTimeFormat`.
 * Identical to `date`; pass time-related options such as `timeStyle`.
 *
 * @example time("en", { timeStyle: "short" })
 */
export const time = (
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): FormatterFunction<number | Date | undefined, string> => {
  const formatter = new Intl.DateTimeFormat(locale, options);
  return (value) => formatter.format(value);
};
