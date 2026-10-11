import { describe, expect, test } from "bun:test";
import { getFallbackProxy } from "./fallback";

describe("getFallbackProxy", () => {
  // biome-ignore lint/suspicious/noExplicitAny: shape is irrelevant for the fallback
  const LL = getFallbackProxy<any>();

  test("nothing", () => expect(LL()).toBe(""));
  test("property", () => expect(LL.test()).toBe(""));
  test("nested", () => expect(LL.nested.test()).toBe(""));
  test("array", () => expect(LL[0]()).toBe(""));
  test("array length", () => expect(LL.length).toBe(0));
  test("array nested", () => expect(LL.test[0]()).toBe(""));
  test("array nested length", () => expect(LL.test.length).toBe(0));
});
