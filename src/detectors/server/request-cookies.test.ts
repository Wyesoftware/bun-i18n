import { describe, expect, test } from "bun:test";
import type { Locale } from "../../runtime/core";
import { initRequestCookiesDetector } from "./request-cookies";

describe("initRequestCookiesDetector", () => {
  describe("express-style `req.cookies`", () => {
    const testDetector = (
      name: string,
      cookieValue: string | undefined,
      expected: Locale[],
      cookieName: string | undefined = undefined,
    ) =>
      test(name, () => {
        const req = { cookies: cookieValue };
        const detector = initRequestCookiesDetector(req, cookieName);
        expect(detector()).toEqual(expected);
      });

    testDetector("undefined", undefined, []);

    testDetector("empty", "", []);

    testDetector("single value", "lang=de-AT", ["de-AT"]);

    testDetector("single value with custom key", "locale=en-US", ["en-US"], "locale");

    testDetector("single value with custom key not specified", "locale=fr", []);

    testDetector("single value with wrong custom key not specified", "lang=fr", [], "locale");

    testDetector("multiple values", "_ga=weTrackYouEverywhere;lang=it", ["it"]);

    testDetector("multiple values with custom key", "cookie=test123;user-lang=es", ["es"], "user-lang");

    testDetector("multiple values without lang", "cookie1=some-value;cookie2=another-value", []);
  });

  describe("Web `Request` (`Cookie` header)", () => {
    const requestWithCookie = (cookie?: string) =>
      new Request("https://example.com/", { headers: cookie === undefined ? {} : { cookie } });

    test("no cookie header", () => {
      expect(initRequestCookiesDetector(requestWithCookie())()).toEqual([]);
    });

    test("single value", () => {
      expect(initRequestCookiesDetector(requestWithCookie("lang=de-AT"))()).toEqual(["de-AT"]);
    });

    test("multiple values", () => {
      expect(initRequestCookiesDetector(requestWithCookie("_ga=1; lang=it; theme=dark"))()).toEqual([
        "it",
      ]);
    });

    test("custom key", () => {
      expect(initRequestCookiesDetector(requestWithCookie("user-lang=es"), "user-lang")()).toEqual([
        "es",
      ]);
    });

    test("missing key", () => {
      expect(initRequestCookiesDetector(requestWithCookie("theme=dark"))()).toEqual([]);
    });
  });
});
