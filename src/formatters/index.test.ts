import { describe, expect, test } from "bun:test";
import { i18nObject } from "../runtime/object";
import { i18nString } from "../runtime/string";
import {
  date,
  identity,
  ignore,
  lowercase,
  number,
  replace,
  time,
  uppercase,
} from "./index";

const translation = {
  UPPERCASE: "This is a {0|uppercase}.",
  MANUAL_UPPERCASE: "I AM {0|manualUppercase}.",
  LOWERCASE: "This should be {0|lowercase}.",
  CENSOR_NUMBERS: "Your PIN is {0|censorNumbers}",
  DATE_EN: "The date is {0|dateEN}.",
  DATE_CUSTOM: "The date is {0|dateCUSTOM}.",
  TIME_EN: "The time is {0|timeEN}.",
  NUMBER: "Price: {total:number|currency}",
  NO_SPACES: "{0|noSpaces}",
  IGNORE: "Hi {name|ignore}",
  IDENTITY: "Hi {name|identity}",
  CHAINING: "{count|sqrt|round}",
};

// `timeZone: "UTC"` keeps the date assertions independent of the machine's zone.
const formatters = {
  uppercase,
  manualUppercase: (value: string) => value.toUpperCase(),
  lowercase,
  censorNumbers: replace(/[0-9]/g, "*"),
  dateEN: date("en", { timeZone: "UTC" }),
  dateCUSTOM: date("en", {
    day: "numeric",
    month: "long",
    year: "2-digit",
    timeZone: "UTC",
  }),
  timeEN: time("en", { timeStyle: "short", timeZone: "UTC" }),
  noSpaces: (value: string) => value.replace(/\s/g, ""),
  ignore,
  identity,
  sqrt: Math.sqrt,
  round: Math.round,
  currency: number("en", { style: "currency", currency: "USD" }),
};

describe("formatters", () => {
  const LLL = i18nString("en", formatters);

  test("LLL uppercase", () =>
    expect<string>(LLL("This is a {0|uppercase}", "test")).toBe("This is a TEST"));

  const LL = i18nObject("en", translation, formatters);

  // 2020-03-13T00:00:00.000Z
  const someDate = new Date(1584057600000);

  test("uppercase", () => expect<string>(LL.UPPERCASE("test")).toBe("This is a TEST."));

  test("manual uppercase", () =>
    expect<string>(LL.MANUAL_UPPERCASE("big")).toBe("I AM BIG."));

  test("lowercase", () =>
    expect<string>(LL.LOWERCASE("SMALL")).toBe("This should be small."));

  test("censor numbers", () =>
    expect<string>(LL.CENSOR_NUMBERS("1234")).toBe("Your PIN is ****"));

  test("date en", () =>
    expect<string>(LL.DATE_EN(someDate)).toBe("The date is 3/13/2020."));

  test("date custom", () =>
    expect<string>(LL.DATE_CUSTOM(someDate)).toBe("The date is March 13, 20."));

  test("date from timestamp", () =>
    expect<string>(LL.DATE_EN(1584057600000)).toBe("The date is 3/13/2020."));

  test("time en", () =>
    expect<string>(LL.TIME_EN(someDate)).toBe("The time is 12:00 AM."));

  test("number", () =>
    expect<string>(LL.NUMBER({ total: 1000 })).toBe("Price: $1,000.00"));

  test("no spaces", () =>
    expect<string>(LL.NO_SPACES("some text with no spaces")).toBe("sometextwithnospaces"));

  test("ignore", () => expect<string>(LL.IGNORE({ name: "John" })).toBe("Hi "));

  test("identity", () => expect<string>(LL.IDENTITY({ name: "John" })).toBe("Hi John"));

  test("chaining", () => expect<string>(LL.CHAINING({ count: 5 })).toBe("2"));
});
