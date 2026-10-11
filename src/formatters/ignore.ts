import type { FormatterFunction } from "../runtime/core";

/** Drops the value and renders an empty string. */
export const ignore: FormatterFunction<unknown, ""> = () => "";
