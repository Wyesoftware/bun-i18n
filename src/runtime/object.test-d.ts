// Type-level tests, checked by `tsc --noEmit`. Not executed.
import { typesafeI18nObject } from "./object";

{
  const translations = {
    test: "test",
    "with-arg": "Hello {name:string}",
    something: "test {abc} {cde}",
    optional: "{a?:number}",
    switch: "Added a new photo to {gender|{male: his, female: her}} stream.",
    switchWithOtherArguments:
      "{name:string} added a new photo to {gender|{male: his, female: her, other: their}} stream.",
    indexed: "{0:string} is {1:number} years old",
    nested: {
      deep: {
        greeting: "Hi {name:string}",
        list: ["first {0:number}", "second"],
      },
    },
  } as const;

  const LL = typesafeI18nObject("en", translations);

  // @ts-expect-error no argument allowed
  LL.test("");

  LL["with-arg"]({ name: "TypeScript" });
  // @ts-expect-error name must be of type string
  LL["with-arg"]({ name: 123 });
  // @ts-expect-error names is not allowed
  LL["with-arg"]({ names: "" });

  // @ts-expect-error expects an argument
  LL.something();
  // @ts-expect-error expects all arguments
  LL.something({ abc: true });
  LL.something({ abc: true, cde: false });

  LL.optional({});
  LL.optional({ a: undefined });
  LL.optional({ a: 123 });
  // @ts-expect-error prop must be of type number
  LL.optional({ a: "" });

  // @ts-expect-error expects an argument
  LL.switch();
  // @ts-expect-error expects an argument of type string
  LL.switch({ gender: 123 });
  // @ts-expect-error expects an argument of 'male' | 'female'
  LL.switch({ gender: "some string" });
  LL.switch({ gender: "male" });
  LL.switchWithOtherArguments({ name: "Alex", gender: "other" });

  // index-based arguments
  LL.indexed("John", 42);
  LL.indexed({ 0: "John", 1: 42 });
  // @ts-expect-error wrong order
  LL.indexed(42, "John");

  // nested levels keep their typing
  LL.nested.deep.greeting({ name: "x" });
  // @ts-expect-error name must be a string
  LL.nested.deep.greeting({ name: 1 });
  // @ts-expect-error expects an argument
  LL.nested.deep.greeting();
  LL.nested.deep.list[0](1);
  // @ts-expect-error must be a number
  LL.nested.deep.list[0]("1");
  LL.nested.deep.list[1]();

  // the result is a LocalizedString
  const result: string = LL.test();
  void result;
}

{
  const translations = {
    upper: "{a|uppercase}",
    invalid: "{a|lowercase}",
    chained:
      "Added a new photo to {gender|uppercase|{male: his, female: her, *: their}} stream",
  } as const;

  const LL = typesafeI18nObject("en", translations, {
    uppercase: (value: string) => value?.toUpperCase?.(),
    "some-fn": () => "",
  });

  LL.upper({ a: "value" });

  // @ts-expect-error invalid formatter
  LL.invalid({ a: "test" });

  // @ts-expect-error expects 'gender' parameter
  LL.chained({});
  LL.chained({ gender: "" });
}

{
  // translations passed inline are inferred as const
  const LL = typesafeI18nObject("en", { hi: "Hi {name:string}" });
  LL.hi({ name: "x" });
  // @ts-expect-error name must be a string
  LL.hi({ name: 1 });
}
