import type { FormatterFunction } from "../runtime/core";

/** Converts the value to lower case. */
export const lowercase: FormatterFunction<string, string> = (value) =>
  value?.toLowerCase();
