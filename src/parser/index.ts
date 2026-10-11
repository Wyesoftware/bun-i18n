export {
  parseRawText,
  parseCases,
  isBasicPluralPart,
  removeOuterBrackets,
  REGEX_SWITCH_CASE,
  type BasicPart,
  type BasicTextPart,
  type BasicArgumentPart,
  type BasicPluralPart,
} from "./basic";

export {
  parseMessage,
  isTextPart,
  isPluralPart,
  isParameterPart,
  isTransformParameterFormatterPart,
  isTransformParameterSwitchCasePart,
} from "./advanced/parse";
export {
  serializeMessage,
  serializeMessageWithoutTypes,
} from "./advanced/serialize";
export type {
  ParsedMessage,
  ParsedMessagePart,
  TextPart,
  PluralPart,
  ParameterPart,
  TransformParameterPart,
  TransformParameterFormatterPart,
  TransformParameterSwitchCasePart,
  TransformParameterSwitchCaseCasePart,
} from "./advanced/types";
