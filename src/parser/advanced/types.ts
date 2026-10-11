// Advanced parser: a richer, self-describing AST used by the generator and
// tooling (not at runtime). Every part carries a `kind` discriminator.

export type ParsedMessage = ParsedMessagePart[];

export type ParsedMessagePart = TextPart | PluralPart | ParameterPart;

/** Plain text between placeholders. Empty text parts are never emitted. */
export type TextPart = {
  kind: "text";
  content: string;
};

/**
 * A plural placeholder such as `{{Project|Projects}}`.
 * Only the forms present in the source are set; `other` is always set.
 */
export type PluralPart = {
  kind: "plural";
  key: string;
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

/** An argument placeholder such as `{name:string|uppercase}`. */
export type ParameterPart = {
  kind: "parameter";
  key: string;
  /** all types seen for this key; `['unknown']` when none could be inferred */
  types: string[];
  optional: boolean;
  /** formatters and switch-case statements, applied left to right */
  transforms: TransformParameterPart[];
};

export type TransformParameterPart =
  | TransformParameterFormatterPart
  | TransformParameterSwitchCasePart;

/** A named formatter, e.g. `uppercase` in `{name|uppercase}`. */
export type TransformParameterFormatterPart = {
  kind: "formatter";
  name: string;
};

/** A switch-case statement, e.g. `{yes: Ja, no: Nein}` in `{answer|{yes: Ja, no: Nein}}`. */
export type TransformParameterSwitchCasePart = {
  kind: "switch-case";
  cases: TransformParameterSwitchCaseCasePart[];
  /** the original source text of the statement, including the outer braces */
  raw?: string;
};

export type TransformParameterSwitchCaseCasePart = {
  key: string;
  value: string;
};
