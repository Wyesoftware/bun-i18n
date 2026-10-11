import { describe, expect, test } from "bun:test";
import { getWrappedString } from "./dictionary";

describe("getWrappedString", () => {
  const cases: [string, string][] = [
    ["", "''"],
    ["'", `"'"`],
    ['"', `'"'`],
    [`'"`, "`'\"`"],
    ["test", "'test'"],
    ["This is a\nexample.", "`This is a\nexample.`"],
    ["it's", `"it's"`],
    ["a `tick` and 'quote' and \"dq\"", "`a \\`tick\\` and 'quote' and \"dq\"`"],
  ];

  for (const [text, expected] of cases) {
    test(JSON.stringify(text), () => expect(getWrappedString(text)).toBe(expected));
  }

  test("template literal when a ${string} type is embedded", () => {
    expect(getWrappedString("a|{b:${string}}", true)).toBe("`a|{b:${string}}`");
  });
});
