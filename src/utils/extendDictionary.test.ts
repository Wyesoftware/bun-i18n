import { describe, expect, test } from "bun:test";
import type { BaseTranslation } from "../runtime/core";
import { extendDictionary, initExtendDictionary } from "./index";

const translation = {
  simple: "Hello",
  nested: { value: "Hello nested" },
};

describe("extendDictionary", () => {
  test("does no mutation", () => {
    // biome-ignore lint/suspicious/noExplicitAny: probing for an added key
    const base = {} as any;
    extendDictionary(base, { hey: "there" });
    expect(base.hey).toBeUndefined();
  });

  test("does no nested mutation", () => {
    const base = { nested: { value: "Hello nested", other: "stays" } };
    const extended = extendDictionary(base, { nested: { value: "changed" } });
    expect(base.nested.value).toBe("Hello nested");
    expect(extended.nested).not.toBe(base.nested);
  });

  test("empty base", () => {
    const extended = extendDictionary({}, { hey: "there" });
    expect(extended).toEqual({ hey: "there" });
  });

  test("empty part", () => {
    const extended = extendDictionary({ hey: "there" }, {});
    expect(extended).toEqual({ hey: "there" });
  });

  test("simple extend", () => {
    const extended = extendDictionary(translation, { simple: "Hello extended" });
    expect(extended).toEqual({
      simple: "Hello extended",
      nested: { value: "Hello nested" },
    });
  });

  test("nested extend", () => {
    const extended = extendDictionary(translation, {
      nested: { value: "Hello nested extended" },
    });
    expect(extended).toEqual({
      simple: "Hello",
      nested: { value: "Hello nested extended" },
    });
  });

  test("nested extend with simple", () => {
    const extended = extendDictionary(translation, {
      simple: "Hello extended",
      nested: { value: "Hello nested extended" },
    });
    expect(extended).toEqual({
      simple: "Hello extended",
      nested: { value: "Hello nested extended" },
    });
  });

  test("nested extend keeps sibling keys", () => {
    const base = { nested: { a: "A", b: "B", deeper: { c: "C", d: "D" } } };
    const extended = extendDictionary(base, {
      nested: { b: "B2", deeper: { d: "D2" } },
    });
    expect(extended).toEqual({
      nested: { a: "A", b: "B2", deeper: { c: "C", d: "D2" } },
    });
  });

  test("add prop", () => {
    const extended = extendDictionary<BaseTranslation, BaseTranslation>(translation, {
      add: "test",
    });
    expect(extended).toEqual({
      simple: "Hello",
      add: "test",
      nested: { value: "Hello nested" },
    });
  });

  test("add nested prop", () => {
    const extended = extendDictionary<BaseTranslation, BaseTranslation>(translation, {
      add: { nested: "test" },
    });
    expect(extended).toEqual({
      simple: "Hello",
      add: { nested: "test" },
      nested: { value: "Hello nested" },
    });
  });

  test("array", () => {
    const extended = extendDictionary<BaseTranslation, BaseTranslation>(
      {},
      { add: ["hey"] },
    );
    expect(extended).toEqual({ add: ["hey"] });

    const extended2 = extendDictionary<BaseTranslation, BaseTranslation>(extended, {
      add: ["ho"],
    });
    expect(extended2).toEqual({ add: ["ho"] });
  });

  test("array merged by index", () => {
    const base = { list: ["a", "b", "c"] };
    const extended = extendDictionary<BaseTranslation, BaseTranslation>(base, {
      list: ["x"],
    });
    expect(extended).toEqual({ list: ["x", "b", "c"] });
    expect(base.list).toEqual(["a", "b", "c"]);
  });

  test("string replaces object", () => {
    const extended = extendDictionary<BaseTranslation, BaseTranslation>(
      { nested: { value: "x" } },
      { nested: "flat" },
    );
    expect(extended).toEqual({ nested: "flat" });
  });

  test("initExtendDictionary", () => {
    type Translation = { greeting: string; nested: { bye: string } };
    const extend = initExtendDictionary<Translation>();
    const en: Translation = { greeting: "Hi", nested: { bye: "Bye" } };
    const enGB = extend(en, { greeting: "Hiya" });
    expect(enGB).toEqual({ greeting: "Hiya", nested: { bye: "Bye" } });
  });
});
