import { describe, expect, test } from "bun:test";
import { i18n } from "./instance";

describe("i18n", () => {
  const L = i18n(
    {
      en: { apples: "{0} apple{{s}}", hi: "Hi {name|upper}" },
      de: { apples: "{0} {{Apfel|Äpfel}}", hi: "Hallo {name|upper}" },
    },
    {
      en: { upper: (v: string) => v.toUpperCase() },
      de: { upper: (v: string) => v.toUpperCase() },
    },
  );

  test("per locale translations", () => {
    expect<string>(L.en.apples(1)).toBe("1 apple");
    expect<string>(L.en.apples(2)).toBe("2 apples");
    expect<string>(L.de.apples(1)).toBe("1 Apfel");
    expect<string>(L.de.apples(2)).toBe("2 Äpfel");
  });

  test("per locale formatters", () => {
    expect<string>(L.en.hi({ name: "john" })).toBe("Hi JOHN");
    expect<string>(L.de.hi({ name: "john" })).toBe("Hallo JOHN");
  });

  test("instances are cached per locale", () => {
    expect(L.en).toBe(L.en);
  });

  test("formatters are optional", () => {
    const L2 = i18n({ en: { hi: "Hi {0}" } });
    expect<string>(L2.en.hi("x")).toBe("Hi x");
  });
});
