import type { FormatterFunction } from "../runtime/core";

/** Converts the value to upper case. */
export const uppercase: FormatterFunction<string, string> = (value) =>
  value?.toUpperCase();
