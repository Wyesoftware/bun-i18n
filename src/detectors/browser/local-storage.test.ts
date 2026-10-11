import { afterEach, describe, expect, test } from "bun:test";
import type { Locale } from "../../runtime/core";
import { initLocalStorageDetector, localStorageDetector } from "./local-storage";

describe("localStorageDetector", () => {
  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  const mockStorage = (items: Record<string, string> | undefined): Storage =>
    ({ getItem: (key: string) => items?.[key] ?? null }) as Storage;

  const testDetector = (
    name: string,
    items: Record<string, string> | undefined,
    expected: Locale[],
    itemKey: string | undefined = undefined,
  ) =>
    test(name, () => {
      globalThis.localStorage = mockStorage(items);

      const detector = initLocalStorageDetector(itemKey);
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

  test("default detector reads the `lang` item", () => {
    globalThis.localStorage = mockStorage({ lang: "de" });
    expect(localStorageDetector()).toEqual(["de"]);
  });

  test("returns [] when `localStorage` is not defined (server)", () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    expect(localStorageDetector()).toEqual([]);
  });
});
