import { describe, expect, test } from "bun:test";
import type { Locale } from "../../runtime/core";
import { initAcceptLanguageHeaderDetector } from "./accept-language-header";

describe("initAcceptLanguageHeaderDetector", () => {
  const testDetector = (
    name: string,
    acceptLanguageHeaderValue: string | undefined,
    expected: Locale[],
    headerName = "accept-language",
  ) =>
    test(name, () => {
      const headers = new Headers();
      if (acceptLanguageHeaderValue !== undefined) {
        headers.set(headerName, acceptLanguageHeaderValue);
      }
      const detector = initAcceptLanguageHeaderDetector({ headers });
      expect(detector()).toEqual(expected);
    });

  testDetector("undefined", undefined, []);

  testDetector("empty", "", []);

  testDetector("single value without weight", "de-CH", ["de-CH"]);

  testDetector("multiple values", "de, de-AT;q=0.9, en;q=0.8", ["de", "de-AT", "en"]);

  testDetector("multiple values without weight", "en-US,fr-CA", ["en-US", "fr-CA"]);

  testDetector("multiple values with weight", "en-US,en;q=0.9", ["en-US", "en"]);

  testDetector("multiple values with *", "fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5", [
    "fr-CH",
    "fr",
    "en",
    "de",
  ]);

  testDetector("* only", "*", []);

  testDetector(
    "multiple values with weight and uppercased header name",
    "en-US,en;q=0.9",
    ["en-US", "en"],
    "ACCEPT-LANGUAGE",
  );

  testDetector(
    "multiple values with * and capitalized Header name",
    "fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5",
    ["fr-CH", "fr", "en", "de"],
    "Accept-Language",
  );

  testDetector("languages starting with the letter q are kept", "qu, es;q=0.8", ["qu", "es"]);

  test("works with a Web `Request`", () => {
    const request = new Request("https://example.com/", {
      headers: { "accept-language": "it-IT, it;q=0.9" },
    });
    expect(initAcceptLanguageHeaderDetector(request)()).toEqual(["it-IT", "it"]);
  });

  test("custom header key", () => {
    const headers = new Headers({ "x-lang": "de, en;q=0.5" });
    expect(initAcceptLanguageHeaderDetector({ headers }, "x-lang")()).toEqual(["de", "en"]);
  });
});
