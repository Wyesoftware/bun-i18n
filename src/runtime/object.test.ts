import { describe, expect, test } from "bun:test";
import { i18nObject, typesafeI18nObject } from "./object";

describe("i18nObject", () => {
  const translation = {
    NO_PARAM: "This is a test.",
    PARAM: "{0}",
    TRIM_KEY: "{ 0 }",
    TRIM_PARAM: "Hey{0}",
    TRIM_PLURAL: "{{ key : 1 | 2 }}",
    PLURAL: "apple{{s}}",
    SINGULAR_PLURAL: "{0} {{Apfel|Äpfel}}",
    MULTIPLE_PARAMS: "{0} {1}",
    PARAMS_WITH_SPACES: "{ test param 1 } {test param2}",
    MULTIPLE_PARAMS_PLURAL: "{0} banana{{s}} and {1} apple{{s}}",
    EMPTY: "",
    SAME_PARAM: "{0} {0} {0}",
    SAME_KEYED_PARAM: "{name} {name} {name}",
    ONLY_PLURAL: "{{plural}}",
    ONLY_SINGULAR_PLURAL: "{{singular|plural}}",
    ONLY_SINGULAR: "{{singular|}}",
    ZERO: "{{zero|one|other}}",
    PLURAL_VALUE: "{{ no items | one item | ?? items }}",
    name: "fn name",
    apply: "fn apply",
    length: "fn length",
  };

  const LL = i18nObject("en", translation);

  // @ts-expect-error unknown key
  test("wrong key", () => expect<string>(LL.WRONG_KEY()).toBe(""));
  // @ts-expect-error unknown key
  test("wrong nested key", () => expect<string>(LL.WRONG_KEY.NESTED()).toBe(""));

  test("no param", () => expect<string>(LL.NO_PARAM()).toBe(translation.NO_PARAM));
  test("empty", () => expect<string>(LL.EMPTY()).toBe(""));

  test("trim key", () => expect<string>(LL.TRIM_KEY("test")).toBe("test"));
  test("trim param", () => expect<string>(LL.TRIM_PARAM(" Ho ")).toBe("HeyHo"));

  test("same param number", () => expect<string>(LL.SAME_PARAM(1)).toBe("1 1 1"));
  test("same param string", () => expect<string>(LL.SAME_PARAM("1")).toBe("1 1 1"));
  test("same keyed param", () =>
    expect<string>(LL.SAME_KEYED_PARAM({ name: "test" })).toBe("test test test"));

  test("param", () => expect<string>(LL.PARAM("hi")).toBe("hi"));
  test("param but empty", () => expect<string>(LL.PARAM()).toBe(""));
  test("param but empty multiple", () => expect<string>(LL.SAME_PARAM()).toBe("  "));

  test("trim plural one", () => expect<string>(LL.TRIM_PLURAL({ key: 1 })).toBe("1"));
  test("trim plural other", () =>
    expect<string>(LL.TRIM_PLURAL({ key: 2 })).toBe("2"));

  test("plural 0", () => expect<string>(LL.PLURAL(0)).toBe("apples"));
  test("plural 1", () => expect<string>(LL.PLURAL(1)).toBe("apple"));
  test("plural 2", () => expect<string>(LL.PLURAL(2)).toBe("apples"));

  test("singular-plural 0", () =>
    expect<string>(LL.SINGULAR_PLURAL(0)).toBe("0 Äpfel"));
  test("singular-plural 1", () =>
    expect<string>(LL.SINGULAR_PLURAL(1)).toBe("1 Apfel"));
  test("singular-plural 2", () =>
    expect<string>(LL.SINGULAR_PLURAL(2)).toBe("2 Äpfel"));

  test("multiple params", () => expect<string>(LL.MULTIPLE_PARAMS(1, 2)).toBe("1 2"));
  test("params with spaces", () =>
    expect<string>(
      LL.PARAMS_WITH_SPACES({ "test param 1": "1", "test param2": "2" }),
    ).toBe("1 2"));
  test("multiple params plural", () =>
    expect<string>(LL.MULTIPLE_PARAMS_PLURAL(1, 2)).toBe("1 banana and 2 apples"));

  test("only plural true", () => expect<string>(LL.ONLY_PLURAL(true)).toBe(""));
  test("only plural false", () => expect<string>(LL.ONLY_PLURAL(false)).toBe("plural"));

  test("only singular plural true", () =>
    expect<string>(LL.ONLY_SINGULAR_PLURAL(true)).toBe("singular"));
  test("only singular plural false", () =>
    expect<string>(LL.ONLY_SINGULAR_PLURAL(false)).toBe("plural"));

  test("only singular true", () =>
    expect<string>(LL.ONLY_SINGULAR(true)).toBe("singular"));
  test("only singular false", () => expect<string>(LL.ONLY_SINGULAR(false)).toBe(""));

  test("zero 0", () => expect<string>(LL.ZERO(0)).toBe("zero"));
  test("zero 1", () => expect<string>(LL.ZERO(1)).toBe("one"));
  test("zero 7", () => expect<string>(LL.ZERO(7)).toBe("other"));

  test("plural zero: no", () => expect<string>(LL.PLURAL_VALUE(0)).toBe("no items"));
  test("plural zero: one", () => expect<string>(LL.PLURAL_VALUE(1)).toBe("one item"));
  test("plural zero: ??", () => expect<string>(LL.PLURAL_VALUE(99)).toBe("99 items"));

  test("function attribute name", () => expect<string>(LL.name()).toBe("fn name"));
  test("function attribute apply", () => expect<string>(LL.apply()).toBe("fn apply"));
  test("function attribute length", () =>
    expect<string>(LL.length()).toBe("fn length"));
});

describe("i18nObject advanced plural rules", () => {
  const LL = i18nObject("ar-EG", {
    ADVANCED_PLURAL: "{{zero|one|two|few|many|other}}",
  });

  test("0", () => expect<string>(LL.ADVANCED_PLURAL(0)).toBe("zero"));
  test("1", () => expect<string>(LL.ADVANCED_PLURAL(1)).toBe("one"));
  test("2", () => expect<string>(LL.ADVANCED_PLURAL(2)).toBe("two"));
  test("6", () => expect<string>(LL.ADVANCED_PLURAL(6)).toBe("few"));
  test("18", () => expect<string>(LL.ADVANCED_PLURAL(18)).toBe("many"));
  test('"test"', () => expect<string>(LL.ADVANCED_PLURAL("test")).toBe("other"));
});

describe("i18nObject nested", () => {
  const LL = i18nObject("en", {
    z: "nested 0",
    a: { b: "nested 1" },
    d: { e: { f: "nested 2" } },
    o: { p: { q: { r: { s: { t: { u: "nested 3" } } } } } },
  });

  test("nested 0", () => expect<string>(LL.z()).toBe("nested 0"));
  test("nested 1", () => expect<string>(LL.a.b()).toBe("nested 1"));
  test("nested 2", () => expect<string>(LL.d.e.f()).toBe("nested 2"));
  test("nested 3", () => expect<string>(LL.o.p.q.r.s.t.u()).toBe("nested 3"));
});

describe("i18nObject arrays", () => {
  const LL4 = i18nObject("en", [{ HI: "test-1" }, { HO: "test-2" }] as const);

  test("array root 0", () => expect<string>(LL4[0].HI()).toBe("test-1"));
  test("array root 1", () => expect<string>(LL4[1].HO()).toBe("test-2"));

  const LL5 = i18nObject("en", {
    test1: [{ a: "test-a" }, { b: "test-b" }, { c: "test-c" }, { d: "test-d" }],
  } as const);

  test("array nested 0", () => expect<string>(LL5.test1["0"].a()).toBe("test-a"));
  test("array nested 3", () => expect<string>(LL5.test1["3"].d()).toBe("test-d"));

  const LL6 = i18nObject("en", {
    test1: [{ a: "test-a", a1: ["test", { aa1: "test-aa1" }] }],
  } as const);

  test("array deeply nested 0.a1.0", () =>
    expect<string>(LL6.test1[0].a1[0]()).toBe("test"));
  test("array deeply nested 0.a1.1.aa1", () =>
    expect<string>(LL6.test1[0].a1[1].aa1()).toBe("test-aa1"));

  const LL7 = i18nObject("en", ["test-1", "test-2"] as const);

  test("array root strings", () => {
    expect<string>(LL7[0]()).toBe("test-1");
    expect<string>(LL7[1]()).toBe("test-2");
  });

  test("array length should return correct value", () =>
    expect(Array.from(LL7).length).toBe(2));
  test("array length on non-array should return 0", () =>
    // @ts-expect-error a translation function is not iterable
    expect(Array.from(LL7["0"]).length).toBe(0));

  test("for loop", () => {
    let calls = 0;
    for (let idx = 0; idx < Array.from(LL7).length; idx++) {
      expect<string>(LL7[idx]?.()).toBe(LL7[idx]?.());
      calls++;
    }
    expect(calls).toBe(2);
  });

  test("forEach", () => {
    let calls = 0;
    Array.from(LL7).forEach((entry, index) => {
      expect<string>(LL7[index]?.()).toBe(entry());
      calls++;
    });
    expect(calls).toBe(2);
  });

  test("for of", () => {
    let index = 0;
    for (const entry of LL7) {
      expect<string>(LL7[index]?.()).toBe(entry());
      index++;
    }
    expect(index).toBe(2);
  });

  test("for in", () => {
    let calls = 0;
    for (const entry in LL7) {
      expect<string>(LL7[entry as unknown as 0]?.()).toBe(
        LL7[Number(entry) as 0]?.(),
      );
      calls++;
    }
    expect(calls).toBe(2);
  });
});

describe("i18nObject formatters", () => {
  const LL = i18nObject(
    "en",
    {
      identity: "{0|identity}",
      trim: "{ 0 | ignore }",
      chaining: "{ value | addA | addB | addC }",
      order: "{ value | addC | addA | identity | addB }",
    },
    {
      identity: (value) => value,
      ignore: () => "",
      addA: (value) => `${value}A`,
      addB: (value) => `${value}B`,
      addC: (value) => `${value}C`,
    },
  );

  test("identity", () => expect<string>(LL.identity("test")).toBe("test"));
  test("trim", () => expect<string>(LL.trim("test")).toBe(""));
  test("chaining", () => expect<string>(LL.chaining({ value: "" })).toBe("ABC"));
  test("order", () => expect<string>(LL.order({ value: "" })).toBe("CAB"));
});

describe("i18nObject switch-case", () => {
  const LL = i18nObject(
    "en",
    {
      switch1: "{0|{yes:JA,no:NEIN}}",
      keyed: "{option|{yes:JA,no:NEIN}}",
      switch2: "{0| {  yes : JA , no : NEIN }}",
      switchFormatter: "{0|{y: yes, n: no }|uppercase}",
      formatterSwitch: "{0|uppercase|{Y: yes, N: no }}",
      formatterSwitchFormatter: "{0|uppercase| {Y: yes, N: no } | uppercase }",
      number: "{0|{1: one, 2: two}}",
      fallback: "{0|{yes:JA, * : NEIN}}",
      emptyNoFallback: "{0|{test:, * : nothing}}",
      spacesInKey: "{0|{a b c: begin, *:rest}}",
      dashesInKey: "{0|{a-b-c: begin, *:rest}}",
      withType: "{0:string|{y:yes,n:no}}",
      withColon: "{0|{time: 10:30, *: n/a}}",
      withComma:
        "Price: ${price:number}. {taxes|{yes: An additional tax, a few bucks for Uncle Sam, will be collected. , no: No taxes apply.}}",
    },
    {
      uppercase: (v: string) => v.toUpperCase(),
    },
  );

  test("yes no", () => expect<string>(LL.switch1("yes")).toBe("JA"));
  test("keyed", () => expect<string>(LL.keyed({ option: "yes" })).toBe("JA"));
  test("trim", () => expect<string>(LL.switch2("no")).toBe("NEIN"));
  test("wrong key", () => expect<string>(LL.switch1("test")).toBe("test"));
  test("switch formatter", () => expect<string>(LL.switchFormatter("y")).toBe("YES"));
  test("formatter switch", () => expect<string>(LL.formatterSwitch("n")).toBe("no"));
  test("formatter switch formatter", () =>
    expect<string>(LL.formatterSwitchFormatter("n")).toBe("NO"));
  test("number", () => expect<string>(LL.number("1")).toBe("one"));
  test("number value", () => expect<string>(LL.number(2)).toBe("two"));
  test("fallback", () => expect<string>(LL.fallback("something")).toBe("NEIN"));
  test("fallback empty", () => expect<string>(LL.emptyNoFallback("test")).toBe(""));
  test("spaces in key", () => expect<string>(LL.spacesInKey("a b c")).toBe("begin"));
  test("dashes in key", () => expect<string>(LL.dashesInKey("a-b-c")).toBe("begin"));
  test("with type", () => expect<string>(LL.withType("y")).toBe("yes"));
  test("value with colon", () => expect<string>(LL.withColon("time")).toBe("10:30"));
  test("with comma 1", () =>
    expect<string>(LL.withComma({ price: "100", taxes: "yes" })).toBe(
      "Price: $100. An additional tax, a few bucks for Uncle Sam, will be collected.",
    ));
  test("with comma 2", () =>
    expect<string>(LL.withComma({ price: "100", taxes: "no" })).toBe(
      "Price: $100. No taxes apply.",
    ));
});

describe("i18nObject locale without PluralRule other for one", () => {
  const LL = i18nObject("pl", {
    MULTIPLE_PARAMS_PLURAL: "{0} banana{{s}} and {1} apple{{s}}",
    SINGULAR_PLURAL: "{{ one item | ?? items }}",
  });

  test("multiple params plural", () =>
    expect<string>(LL.MULTIPLE_PARAMS_PLURAL(1, 2)).toBe("1 banana and 2 apples"));
  test("one", () => expect<string>(LL.SINGULAR_PLURAL(1)).toBe("one item"));
  test("few", () => expect<string>(LL.SINGULAR_PLURAL(5)).toBe("5 items"));
});

describe("typesafeI18nObject", () => {
  const LL = typesafeI18nObject(
    "en",
    {
      hi: "Hi {name:string|uppercase}",
      indexed: "{0:string} is {1:number}",
      nested: { deep: "deep {0}" },
    },
    { uppercase: (v: string) => v.toUpperCase() },
  );

  test("keyed", () => expect<string>(LL.hi({ name: "john" })).toBe("Hi JOHN"));
  test("tuple", () => expect<string>(LL.indexed("x", 1)).toBe("x is 1"));
  test("object", () => expect<string>(LL.indexed({ 0: "x", 1: 1 })).toBe("x is 1"));
  test("nested", () => expect<string>(LL.nested.deep("y")).toBe("deep y"));
});
