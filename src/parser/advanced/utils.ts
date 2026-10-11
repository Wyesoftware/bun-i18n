// Tiny local replacements for the `typesafe-utils` helpers used by the original.

export const isNotUndefined = <T>(value: T | undefined): value is T =>
  value !== undefined;

export const uniqueArray = <T>(values: T[]): T[] => Array.from(new Set(values));
