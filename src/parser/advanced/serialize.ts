import { isParameterPart, isPluralPart, isTextPart } from "./parse";
import type {
  ParameterPart,
  ParsedMessage,
  ParsedMessagePart,
  PluralPart,
  TransformParameterPart,
  TransformParameterSwitchCasePart,
} from "./types";

/**
 * Serializes a parsed message back into its compact string form,
 * e.g. `{name:string|uppercase}` (no whitespace is emitted).
 */
// TODO: maybe add a `spacing` option to emit `{ name: string | uppercase }` instead
export const serializeMessage = (parts: ParsedMessage): string =>
  parts.map(serializePart).join("");

/** Like `serializeMessage`, but omits the type annotations of all parameters. */
export const serializeMessageWithoutTypes = (parts: ParsedMessage): string =>
  serializeMessage(
    parts.map((part) =>
      isParameterPart(part) ? { ...part, types: [] } : part,
    ),
  );

const serializePart = (part: ParsedMessagePart): string => {
  if (isTextPart(part)) return part.content;

  if (isPluralPart(part)) return serializePluralPart(part);

  return serializeParameterPart(part);
};

/** Serializes a plural part, e.g. `{{Project|Projects}}`. The key is never emitted. */
export const serializePluralPart = ({
  zero,
  one,
  two,
  few,
  many,
  other,
}: PluralPart): string =>
  `{{${[zero, one, two, few, many, other]
    .filter((value) => value !== undefined)
    .join("|")}}}`;

const serializeParameterPart = ({
  key,
  optional,
  types,
  transforms,
}: ParameterPart): string => {
  // a type is only emitted when it is unambiguous; `unknown` and unions are dropped
  const type =
    types.length === 1 && types[0] !== "unknown" ? types[0] : undefined;
  const transformsText = transforms.length
    ? `|${transforms.map(serializeTransformPart).join("|")}`
    : "";
  return `{${key}${type ? `:${type}` : ""}${optional ? "?" : ""}${transformsText}}`;
};

const serializeTransformPart = (transform: TransformParameterPart): string =>
  transform.kind === "formatter"
    ? transform.name
    : transform.raw || serializeTransformSwitchCasePart(transform);

const serializeTransformSwitchCasePart = (
  part: TransformParameterSwitchCasePart,
): string =>
  `{${part.cases.map(({ key, value }) => `${key}:${value}`).join(",")}}`;
