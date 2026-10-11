import type { JsDocInfo, TypeInformation } from "../../types";

// Zero-width spaces keep IDE hovers from interpreting `{...}` as JSDoc tags.
const addNonBreakingSpaceBetweenCharacters = (value: string) =>
  value.split("").join("​");

const sanitizeText = (text: string) => text.replace(/\*\//g, "*\\/");

export const createJsDocsString = (
  { text, types, pluralOnlyArgs }: JsDocInfo = {} as JsDocInfo,
  renderTypes = false,
  renderPluralOnlyArgs = true,
  renderNonBreakingSpaceBetweenCharacters = false,
): string => {
  const renderedTypes = renderTypes
    ? Object.entries(types || {})
        .filter(([key]) => renderPluralOnlyArgs || !pluralOnlyArgs.includes(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(createJsDocsParamString)
        .join("")
    : "";

  const sanitizedText = sanitizeText(text);
  const textToDisplay = renderNonBreakingSpaceBetweenCharacters
    ? addNonBreakingSpaceBetweenCharacters(sanitizedText)
    : sanitizedText;

  return textToDisplay.length + renderedTypes.length
    ? `/**
	 * ${textToDisplay}${renderedTypes}
	 */
	`
    : "";
};

const createJsDocsParamString = ([paramName, { types, optional }]: [
  string,
  TypeInformation,
]) => `
	 * @param {${types.join(" | ")}} ${optional ? `[${paramName}]` : paramName}`;
