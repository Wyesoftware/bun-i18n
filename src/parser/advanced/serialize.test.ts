import { describe, expect, test } from "bun:test";
import {
  isParameterPart,
  isTransformParameterSwitchCasePart,
  parseMessage,
} from "./parse";
import { serializeMessage, serializeMessageWithoutTypes } from "./serialize";
import type { ParsedMessage } from "./types";

// every string here is already in the compact form the serializer emits,
// so `serialize(parse(s))` must round-trip to `s`
const strings = [
  // basics
  "Hello World!",
  // parameters
  "Hello {0}!",
  "Hello {1} and {0}",
  "hi {name}",
  "{name1} and {0} are here!",
  "Total {0:number}",
  "Today is {date:Date}",
  "User {name:string} has the email address: '{0:EmailString}'",
  // plural rules
  "Project{{s}}",
  "{0} {{Project|Projects}}",
  "{nr:number} {{Project|Projects}}",
  "{0} weitere{{s|}} Mitglied{{er}}",
  "The list includes {{no items|an item|?? items}}",
  "I have {{zero|one|two|a few|many|a lot}} apple{{s}}",
  // formatters
  "Hello {0|uppercase}!",
  "{date:Date|dateTime}",
  "{date:Date|dateTime|upperCase|trim}",
  "Hi {name:string|upper}, today is: {date:Date|dateTime}",
  // switch-case
  "{username:string} added a new photo to {gender|{male:his,female:her,*:their}} stream.",
  "Price: ${price:number}. {taxes|{yes:An additional tax will be collected.,no:No taxes apply.}}",
];

// drop `raw` so the serializer has to rebuild switch-case statements from `cases`
const withoutRaw = (parts: ParsedMessage): ParsedMessage =>
  parts.map((part) =>
    isParameterPart(part)
      ? {
          ...part,
          transforms: part.transforms.map((transform) =>
            isTransformParameterSwitchCasePart(transform)
              ? { ...transform, raw: "" }
              : transform,
          ),
        }
      : part,
  );

describe("serializeMessage", () => {
  for (const string of strings) {
    test(string, () => {
      expect(serializeMessage(withoutRaw(parseMessage(string)))).toBe(string);
    });
  }

  test("prefers the raw switch-case text when present", () => {
    const source = "{gender|{ male: his, female: her, *: their }}";
    expect(serializeMessage(parseMessage(source))).toBe(source);
  });
});

describe("serializeMessageWithoutTypes", () => {
  test("drops type annotations", () => {
    expect(
      serializeMessageWithoutTypes(
        parseMessage("Hi {name:string|upper}, {0:number} {{item|items}}"),
      ),
    ).toBe("Hi {name|upper}, {0} {{item|items}}");
  });

  test("keeps the optional marker", () => {
    expect(serializeMessageWithoutTypes(parseMessage("{name?:string}"))).toBe(
      "{name?}",
    );
  });
});
