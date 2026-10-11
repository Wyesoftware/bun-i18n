import { afterEach, describe, expect, test } from "bun:test";
import type { Locale } from "../../runtime/core";
import { initQueryStringDetector, queryStringDetector } from "./query-string";

describe("queryStringDetector", () => {
  afterEach(() => {
    delete (globalThis as { location?: Location }).location;
  });

  const testDetector = (
    name: string,
    queryString: string | undefined,
    expected: Locale[],
    parameterName: string | undefined = undefined,
  ) =>
    test(name, () => {
      globalThis.location = { search: queryString as string } as Location;
      const detector = initQueryStringDetector(parameterName);
      expect(detector()).toEqual(expected);
    });

  testDetector("undefined", undefined, []);

  testDetector("empty", "", []);

  testDetector("single value", "?lang=de-AT", ["de-AT"]);

  testDetector("single value with custom key", "?locale=en-US", ["en-US"], "locale");

  testDetector("single value with custom key not specified", "?locale=fr", []);

  testDetector("single value with wrong custom key not specified", "?lang=fr", [], "locale");

  testDetector("multiple values", "?id=123&lang=it", ["it"]);

  testDetector("multiple values with custom key", "?param=test123&user-lang=es", ["es"], "user-lang");

  testDetector("multiple values without lang", "?param-1=some-value&param2=another-value", []);

  testDetector("key that is only a prefix of another parameter", "?language=de&lang-x=fr", []);

  testDetector("url-encoded value", "?lang=de%2DAT", ["de-AT"]);

  test("default detector reads the `lang` parameter", () => {
    globalThis.location = { search: "?lang=de" } as Location;
    expect(queryStringDetector()).toEqual(["de"]);
  });

  test("returns [] when `location` is not defined (server)", () => {
    delete (globalThis as { location?: Location }).location;
    expect(queryStringDetector()).toEqual([]);
  });
});
