import { describe, expect, test } from "bun:test";
import type { Locale } from "../../runtime/core";
import { initRequestParametersDetector } from "./request-parameters";

describe("initRequestParametersDetector", () => {
  const testDetector = (
    name: string,
    params: Record<string, string> | undefined,
    expected: Locale[],
    parameterName: string | undefined = undefined,
  ) =>
    test(name, () => {
      const req = { params };
      const detector = initRequestParametersDetector(req, parameterName);
      expect(detector()).toEqual(expected);
    });

  testDetector("undefined", undefined, []);

  testDetector("empty", {}, []);

  testDetector("single value", { lang: "de-AT" }, ["de-AT"]);

  testDetector("single value with custom key", { locale: "en-US" }, ["en-US"], "locale");

  testDetector("single value with custom key not specified", { locale: "fr" }, []);

  testDetector("single value with wrong custom key not specified", { lang: "fr" }, [], "locale");

  testDetector("multiple values", { id: "1234", lang: "it" }, ["it"]);

  testDetector("multiple values with custom key", { param: "test123", "user-lang": "es" }, ["es"], "user-lang");

  testDetector("multiple values without lang", { param1: "some-value", param2: "another-value" }, []);

  test("works with a `BunRequest`-like object", () => {
    const request = Object.assign(new Request("https://example.com/de/products"), {
      params: { lang: "de" } as Readonly<Record<"lang", string>>,
    });
    expect(initRequestParametersDetector(request)()).toEqual(["de"]);
  });
});
