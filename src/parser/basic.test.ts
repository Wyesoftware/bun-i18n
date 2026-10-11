import { describe, expect, test } from "bun:test";
import { parseCases, parseRawText } from "./basic";

describe("parseRawText", () => {
  test("string only", () => {
    expect(parseRawText("Hello")).toEqual(["Hello"]);
  });

  test("parameter", () => {
    expect(parseRawText("Hello {name}")).toEqual([
      "Hello ",
      { k: "name", f: [] },
      "",
    ]);
  });

  test("parameter with type", () => {
    expect(parseRawText("Hello {name:string}!", false)).toEqual([
      "Hello ",
      { k: "name", i: "string", n: false, f: [] },
      "!",
    ]);
  });

  test("parameter with type and formatter", () => {
    expect(parseRawText("Hello {name:string|uppercase}!", false)).toEqual([
      "Hello ",
      { k: "name", i: "string", n: false, f: ["uppercase"] },
      "!",
    ]);
  });

  test("parameter with type and multiple formatters", () => {
    expect(parseRawText("Hello {name:string|trim|uppercase}!", false)).toEqual([
      "Hello ",
      { k: "name", i: "string", n: false, f: ["trim", "uppercase"] },
      "!",
    ]);
  });

  test("optional parameter", () => {
    expect(parseRawText("Hi {name?:string}", false)).toEqual([
      "Hi ",
      { k: "name", i: "string", n: true, f: [] },
      "",
    ]);
  });

  test("index-based key 0 is dropped when optimizing (runtime defaults it back to 0)", () => {
    expect<unknown>(parseRawText("Hello {0}")).toEqual(["Hello ", { f: [] }, ""]);
    expect(parseRawText("Hello {0}", false)).toEqual([
      "Hello ",
      { k: "0", i: undefined, n: false, f: [] },
      "",
    ]);
  });

  test("plural binds to the last seen key", () => {
    expect(parseRawText("{count} apple{{s}}")).toEqual([
      "",
      { k: "count", f: [] },
      " apple",
      { k: "count", r: "s" },
      "",
    ]);
  });

  test("plural with singular|plural", () => {
    expect(parseRawText("{{apple|apples}}", false)).toEqual([
      "",
      { k: "0", o: "apple", r: "apples" },
      "",
    ]);
  });

  test("plural with explicit key and zero|one|other", () => {
    expect(parseRawText("{{n:no apples|one apple|?? apples}}", false)).toEqual([
      "",
      { k: "n", z: "no apples", o: "one apple", r: "?? apples" },
      "",
    ]);
  });

  test("plural with all six forms", () => {
    expect(parseRawText("{{z|o|t|f|m|r}}", false)).toEqual([
      "",
      { k: "0", z: "z", o: "o", t: "t", f: "f", m: "m", r: "r" },
      "",
    ]);
  });

  test("switch-case formatter stays a single formatter key", () => {
    expect(parseRawText("{choice|{yes: Ja, no: Nein}}", false)).toEqual([
      "",
      { k: "choice", i: undefined, n: false, f: ["{yes: Ja, no: Nein}"] },
      "",
    ]);
  });
});

describe("parseCases", () => {
  test("simple cases", () => {
    expect(parseCases("{yes: Ja, no: Nein, *: ?}")).toEqual({
      yes: "Ja",
      no: "Nein",
      "*": "?",
    });
  });

  test("value containing a comma", () => {
    expect(parseCases("{a: one, two, b: three}")).toEqual({
      a: "one, two",
      b: "three",
    });
  });

  test("value containing a colon", () => {
    expect(parseCases("{time: 10:30, *: n/a}")).toEqual({
      time: "10:30",
      "*": "n/a",
    });
  });
});
