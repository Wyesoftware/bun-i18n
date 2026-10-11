import { afterEach, describe, expect, test } from "bun:test";
import type { Locale } from "../../runtime/core";
import { htmlLangAttributeDetector } from "./html-lang-attribute";

describe("htmlLangAttributeDetector", () => {
  afterEach(() => {
    delete (globalThis as { document?: Document }).document;
  });

  const testDetector = (name: string, htmlLangValue: string | undefined, expected: Locale[]) =>
    test(name, () => {
      globalThis.document = {
        documentElement: { lang: htmlLangValue } as HTMLElement,
      } as Document;

      expect(htmlLangAttributeDetector()).toEqual(expected);
    });

  testDetector("undefined", undefined, []);

  testDetector("empty", "", []);

  testDetector("locale-without country", "de", ["de"]);

  testDetector("locale-with country", "en-GB", ["en-GB"]);

  test("returns [] when `document` is not defined (server)", () => {
    delete (globalThis as { document?: Document }).document;
    expect(htmlLangAttributeDetector()).toEqual([]);
  });
});
