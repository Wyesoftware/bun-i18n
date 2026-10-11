// Type-level tests, checked by `tsc --noEmit`. Not executed.
import type { LocalizedString } from "./core";
import { typesafeI18nString } from "./string";

{
  const LLL = typesafeI18nString("de");

  // text-only
  LLL("test");
  // @ts-expect-error should not expect arguments
  LLL("", "");

  // plural rules
  // @ts-expect-error plural-only expects an argument
  LLL("apple{{s}}");
  LLL("apple{{s}}", true);
  LLL("{a} apple{{s}}", { a: "test" });
  // @ts-expect-error wrong parameter passed with plural rule
  LLL("{as} apple{{s}}", { a: "test" });
  LLL("{{count: one|other}}", { count: 3 });
  // @ts-expect-error explicit plural key must be passed
  LLL("{{count: one|other}}", { other: 3 });

  // index based arguments: object form
  LLL("{0}", { 0: 123 });
  LLL("{0:number} {1}", { 0: 123, 1: "asd" });
  // index based arguments: tuple form
  LLL("{0}", 123);
  LLL("{0:number} {1}", 123, "asd");
  LLL("{0:number} {1:string}", 123, "asd");
  // @ts-expect-error first argument must be a number
  LLL("{0:number} {1:string}", "123", "asd");
  // @ts-expect-error second argument is missing
  LLL("{0:number} {1:string}", 123);
  LLL("{0:number} {1?:string}", 123);
  LLL("{0:number} {1?:string}", 123, "x");
  // @ts-expect-error too many arguments
  LLL("{0:number} {1:string}", 123, "asd", "extra");

  // single argument
  LLL("{a}", { a: 123 });
  LLL("{a}", { a: "" });
  // @ts-expect-error expects argument
  LLL("{a}");
  // @ts-expect-error expects argument to be trimmed
  LLL("{ a }", { " a ": "" });
  // @ts-expect-error expects only single argument
  LLL("{a}", { a: "", b: "" });
  LLL("{b}", { b: 123 });

  // optional arguments
  // @ts-expect-error must pass an argument
  LLL("{a?}");
  LLL("{a?}", { a: "test" });
  LLL("{a?}", {});
  LLL("{b?:string}", { b: undefined });
  LLL("{0?}", { 0: "test" });

  // multiple arguments
  LLL("{a}{b}", { a: "", b: 123 });
  // @ts-expect-error b is missing
  LLL("{a} {b}", { a: "" });
  // @ts-expect-error c is not allowed
  LLL(" {a} {b}", { a: "", c: 123 });
  LLL("{a}{b}{c}{d}{e}{f}{g}{h}", {
    a: "",
    b: "",
    c: "",
    d: "",
    e: "",
    f: "",
    g: "",
    h: "",
  });

  // repeated keys merge their types
  LLL("{a:string} and {a}", { a: "x" });
  // @ts-expect-error a must be a string
  LLL("{a:string} and {a}", { a: 1 });

  // typed arguments
  LLL("{a:string}", { a: "123" });
  // @ts-expect-error a must be a string
  LLL("{a:string}", { a: 123 });
  LLL("{a:number}", { a: 123 });
  // @ts-expect-error a must be a number
  LLL("{a:number}", { a: "123" });
  // @ts-expect-error a must be a number array
  LLL("{a:number[]}", { a: [123, ""] });
  LLL("{a:number[]}", { a: [123, 0] });
  LLL("{a:Array<number>}", { a: [123, 0] });
  // @ts-expect-error a must be a number array
  LLL("{a:Array<number>}", { a: [""] });
  LLL("{a:LocalizedString}", { a: "" as LocalizedString });
  LLL("{a:Date}", { a: new Date() });
  LLL("{a:boolean[]}", { a: [true] });

  // trimming
  LLL("{a:string }", { a: "" });
  LLL("{a: string}", { a: "" });
  LLL("{a: string }", { a: "" });

  // no formatters configured: every formatter is unknown
  // @ts-expect-error unknown formatter
  LLL("{a|uppercase}", { a: "" });
}

{
  // formatters
  const LLL = typesafeI18nString("en", {
    uppercase: (value: string) => value?.toUpperCase?.(),
    "some-fn": () => "",
  });

  LLL("{a|uppercase}", { a: "" });
  // @ts-expect-error unknown formatter
  LLL("{a|test}", { a: "" });
  LLL("{a| uppercase }", { a: "" });
  LLL("{a| uppercase | some-fn }", { a: "" });
  // @ts-expect-error a must be a number
  LLL("{a : number | uppercase | some-fn }", { a: "" });
  // @ts-expect-error unknown formatter `test`
  LLL("{a:number | uppercase | test }", { a: 123 });

  // switch-case
  LLL("Added a new photo to {gender|{male: his, female: her, *: their}} stream.", {
    gender: "",
  });
  // @ts-expect-error without `*` only the listed cases are allowed
  LLL("Added a new photo to {gender|{male: his, female: her}} stream.", {
    gender: "",
  });
  LLL("Added a new photo to {gender|{ male: his,female:her }} stream.", {
    gender: "male",
  });
  LLL("Added a new photo to {gender|{male: his, female: her}|uppercase} stream.", {
    gender: "male",
  });
  // @ts-expect-error a leading switch-case narrows even when a formatter follows
  LLL("Added a new photo to {gender|{male: his, female: her}|uppercase} stream.", {
    gender: "x",
  });
  LLL(
    "Added a new photo to {gender|uppercase|{male: his, female: her, *: their}} stream.",
    { gender: "" },
  );
  // a switch-case after a formatter checks the formatter output, not the input
  LLL("Added a new photo to {gender|uppercase|{male: his, female: her}} stream.", {
    gender: "anything",
  });
  // values with commas do not widen the case keys
  LLL("{taxes|{yes: An additional tax, a few bucks, will be collected., no: None}}", {
    taxes: "yes",
  });
  // @ts-expect-error only yes | no are allowed
  LLL("{taxes|{yes: An additional tax, a few bucks, will be collected., no: None}}", {
    taxes: "a few bucks",
  });
  // explicit number type is not narrowed by string case keys
  LLL("{0:number|{1: one, 2: two}}", 1);
}
