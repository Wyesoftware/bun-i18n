import { afterEach, describe, expect, test } from "bun:test";
import type { Locale } from "../../runtime/core";
import { documentCookieDetector, initDocumentCookieDetector } from "./document-cookie";

describe("documentCookieDetector", () => {
  afterEach(() => {
    delete (globalThis as { document?: Document }).document;
  });

  const testDetector = (
    name: string,
    cookieValue: string | undefined,
    expected: Locale[],
    cookieName: string | undefined = undefined,
  ) =>
    test(name, () => {
      globalThis.document = { cookie: cookieValue } as Document;
      const detector = initDocumentCookieDetector(cookieName);
      expect(detector()).toEqual(expected);
    });

  testDetector("undefined", undefined, []);

  testDetector("empty", "", []);

  testDetector("single value", "lang=de-AT", ["de-AT"]);

  testDetector("single value with custom key", "locale=en-US", ["en-US"], "locale");

  testDetector("single value with custom key not specified", "locale=fr", []);

  testDetector("single value with wrong custom key not specified", "lang=fr", [], "locale");

  testDetector("multiple values", "_ga=weTrackYouEverywhere;lang=it", ["it"]);

  testDetector("multiple values with spaces", "_ga=weTrackYouEverywhere; lang=it; other=1", ["it"]);

  testDetector("multiple values with custom key", "cookie=test123;user-lang=es", ["es"], "user-lang");

  testDetector("multiple values without lang", "cookie1=some-value;cookie2=another-value", []);

  testDetector("key that is only a prefix of another cookie", "language=de;lang-x=fr", []);

  test("default detector reads the `lang` cookie", () => {
    globalThis.document = { cookie: "lang=de" } as Document;
    expect(documentCookieDetector()).toEqual(["de"]);
  });

  test("returns [] when `document` is not defined (server)", () => {
    delete (globalThis as { document?: Document }).document;
    expect(documentCookieDetector()).toEqual([]);
  });
});
