import { describe, expect, test } from "bun:test";
import { i18nString, typesafeI18nString } from "./string";

describe("i18nString", () => {
  const LLL = i18nString("en");

  test("basic", () => expect<string>(LLL("Welcome")).toBe("Welcome"));

  test("param", () => expect<string>(LLL("Hi {0}", "John")).toBe("Hi John"));

  test("keyed param", () =>
    expect<string>(LLL("Hi {name}", { name: "John" })).toBe("Hi John"));
  test("keyed camelCase", () =>
    expect<string>(LLL("Hi {firstName}", { firstName: "John" })).toBe("Hi John"));
  test("keyed param trimmed", () =>
    expect<string>(LLL("Hi { name }", { name: "John" })).toBe("Hi John"));
  test("keyed param with spaces", () =>
    expect<string>(LLL("Hi { first name }", { "first name": "John" })).toBe("Hi John"));

  test("multiple spaces", () =>
    expect<string>(LLL("test    {0}  ", "xyz")).toBe("test    xyz  "));

  test("optional parameter index", () => expect<string>(LLL("{0?}")).toBe(""));
  test("optional parameter keyed", () => expect<string>(LLL("{age?}")).toBe(""));

  test("plural 0", () => expect<string>(LLL("{0} apple{{s}}", 0)).toBe("0 apples"));
  test("plural 1", () => expect<string>(LLL("{0} apple{{s}}", 1)).toBe("1 apple"));
  test("plural 5", () => expect<string>(LLL("{0} apple{{s}}", 5)).toBe("5 apples"));

  test("trim plural 1", () =>
    expect<string>(LLL("{{ singular | plural }}", 1)).toBe("singular"));
  test("trim plural 2", () =>
    expect<string>(LLL("{{ singular | plural }}", 2)).toBe("plural"));

  test("trim plural only 1", () =>
    expect<string>(LLL("{{ this is plural }}", 1)).toBe(""));
  test("trim plural only 2", () =>
    expect<string>(LLL("{{ this is plural }}", 2)).toBe("this is plural"));

  test("trim singular only 1", () =>
    expect<string>(LLL("{{ this is singular | }}", 1)).toBe("this is singular"));
  test("trim singular only 2", () =>
    expect<string>(LLL("{{ this is singular | }}", 2)).toBe(""));

  test("plural part before key", () =>
    expect<string>(LLL("apple{{s}}: {nrOfApples:number}", { nrOfApples: 1 })).toBe(
      "apple: 1",
    ));

  test("zero 0", () => expect<string>(LLL("{{zero|one|other}}", 0)).toBe("zero"));
  test("zero 1", () => expect<string>(LLL("{{zero|one|other}}", 1)).toBe("one"));
  test("zero 5", () => expect<string>(LLL("{{zero|one|other}}", 5)).toBe("other"));

  test("plural ?? 3", () =>
    expect<string>(LLL("{{zero|one|?? items}}", 3)).toBe("3 items"));
  test("plural ?? 7 7", () =>
    expect<string>(LLL("{{zero|one|?? items ??}}", 7)).toBe("7 items 7"));

  test("each instance has its own cache", () => {
    const de = i18nString("de");
    expect<string>(de("{0} Apfel{{|Äpfel}}", 1)).toBe("1 Apfel");
    expect<string>(LLL("{0} Apfel{{|Äpfel}}", 1)).toBe("1 Apfel");
  });
});

describe("typesafeI18nString", () => {
  const LLL = typesafeI18nString("en", {
    uppercase: (value: string) => value.toUpperCase(),
  });

  test("keyed arguments", () =>
    expect<string>(LLL("Hi {name:string|uppercase}", { name: "John" })).toBe(
      "Hi JOHN",
    ));

  test("index arguments as a tuple", () =>
    expect<string>(LLL("{0} and {1:number}", "a", 2)).toBe("a and 2"));

  test("index arguments as an object", () =>
    expect<string>(LLL("{0} and {1:number}", { 0: "a", 1: 2 })).toBe("a and 2"));

  test("plural only", () => expect<string>(LLL("apple{{s}}", 2)).toBe("apples"));
});
