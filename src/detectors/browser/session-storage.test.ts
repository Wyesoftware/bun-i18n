import { afterEach, describe, expect, test } from "bun:test";
import type { Locale } from "../../runtime/core";
import { initSessionStorageDetector, sessionStorageDetector } from "./session-storage";

describe("sessionStorageDetector", () => {
  afterEach(() => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
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
      globalThis.sessionStorage = mockStorage(items);

      const detector = initSessionStorageDetector(itemKey);
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
    globalThis.sessionStorage = mockStorage({ lang: "de" });
    expect(sessionStorageDetector()).toEqual(["de"]);
  });

  test("returns [] when `sessionStorage` is not defined (server)", () => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    expect(sessionStorageDetector()).toEqual([]);
  });
});
