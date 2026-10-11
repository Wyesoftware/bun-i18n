import type { FormatterFunction } from "../runtime/core";

/**
 * Creates a formatter that runs `String.prototype.replace` on the value.
 *
 * @example replace(/[0-9]/g, "*")
 */
export const replace = (
  searchValue: string | RegExp,
  replaceValue: string,
): FormatterFunction<string, string> =>
  (value) => value?.replace(searchValue, replaceValue);
