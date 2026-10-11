import { afterEach, describe, expect, test } from "bun:test";
import type { Locale } from "../../runtime/core";
import { navigatorDetector } from "./navigator";

describe("navigatorDetector", () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  afterEach(() => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    } else {
      delete (globalThis as { navigator?: Navigator }).navigator;
    }
  });

  const mockNavigator = (languages: string[] | undefined) =>
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      writable: true,
      value: { languages } as unknown as Navigator,
    });

  const testDetector = (name: string, languages: string[] | undefined, expected: Locale[]) =>
    test(name, () => {
      mockNavigator(languages);
      expect(navigatorDetector()).toEqual(expected);
    });

  testDetector("undefined", undefined, []);

  testDetector("empty", [], []);

  testDetector("single value", ["de-AT"], ["de-AT"]);

  testDetector("multiple values", ["de", "en-US", "en", "it"], ["de", "en-US", "en", "it"]);

  test("returns a copy, not the live `navigator.languages` array", () => {
    const languages = ["de"];
    mockNavigator(languages);
    expect(navigatorDetector()).not.toBe(languages);
  });

  test("returns [] with Bun's own `navigator` (no `languages`)", () => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    }
    expect(navigatorDetector()).toEqual([]);
  });

  test("returns [] when `navigator` is not defined (server)", () => {
    delete (globalThis as { navigator?: Navigator }).navigator;
    expect(navigatorDetector()).toEqual([]);
  });
});
