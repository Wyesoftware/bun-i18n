import { describe, expect, test } from "bun:test";
import type { Locale } from "../runtime/core";
import { detectLocale, type LocaleDetector } from "./detect";

describe("detectLocale", () => {
  const testDetector = (
    name: string,
    baseLocale: Locale,
    availableLocales: Locale[],
    detectors: LocaleDetector[] | undefined,
    expected: Locale,
  ) =>
    test(name, () => {
      const detected = detectLocale(baseLocale, availableLocales, ...(detectors || []));
      expect(detected).toBe(expected);
    });

  testDetector("no detector", "de", ["de", "de-AT", "de-CH"], undefined, "de");

  testDetector("empty detector", "de", ["de", "de-AT", "de-CH"], [() => []], "de");

  testDetector("detect de-AT", "de", ["de", "de-AT", "de-CH"], [() => ["de-AT"]], "de-AT");

  testDetector("detect de when de-AT", "de", ["de"], [() => ["de-AT"]], "de");

  testDetector("detect de when wrong casing", "de", ["de"], [() => ["EN", "DE"]], "de");

  testDetector("detect IT when wrong casing", "it", ["de", "IT", "it"], [() => ["en-US", "it"]], "IT");

  testDetector("detect de when locale split", "it", ["en", "en-GB", "it"], [() => ["en-US", "it"]], "en");

  testDetector("detect wrong locales", "de", ["de", "de-AT", "de-CH"], [() => ["fr", "en"]], "de");

  testDetector("detect not first locale", "de", ["de", "de-AT", "de-CH"], [() => ["fr", "en", "de-CH"]], "de-CH");

  testDetector("detect in 2nd detector", "de", ["de"], [() => ["fr", "en", "de-CH"], () => ["de"]], "de");

  testDetector("detect in 3rd detector", "de", ["de"], [() => [], () => ["ru"], () => ["en-US", "de"]], "de");

  test("prefers an exact match over a language-only match of an earlier candidate", () => {
    expect(detectLocale("de", ["en", "en-US"], () => ["en-US"])).toBe("en-US");
  });

  test("returns the available locale with its original casing", () => {
    expect(detectLocale("de", ["en-GB"], () => ["EN-gb"])).toBe("en-GB");
  });
});
