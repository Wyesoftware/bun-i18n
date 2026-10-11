// Snapshot tests for the generator. Each case generates into a scratch
// directory and compares every produced file with `fixtures/<case>/*.expected.*`.
// Run with `UPDATE_SNAPSHOTS=1 bun test test/generator` to accept new output.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getConfigWithDefaultValues } from "../../src/config/read";
import type { GeneratorConfig, GeneratorConfigWithDefaultValues } from "../../src/config/types";
import { generate } from "../../src/generator/generate-files";
import { silentLogger, type Logger } from "../../src/generator/utils/logger";
import type { AnyBaseTranslation, BaseTranslation, Locale } from "../../src/runtime/core";

const fixturesPath = join(import.meta.dir, "fixtures");
const updateSnapshots = !!process.env.UPDATE_SNAPSHOTS;

let outputPath = "";
beforeAll(async () => {
  outputPath = await mkdtemp(join(tmpdir(), "bun-i18n-generator-"));
});
afterAll(async () => {
  if (outputPath) await rm(outputPath, { recursive: true, force: true });
});

const getFileName = (name: string) => `${name}.actual`;

const createConfig = (prefix: string, config?: GeneratorConfig): Promise<GeneratorConfigWithDefaultValues> =>
  getConfigWithDefaultValues(
    {
      outputPath: join(outputPath, prefix),
      typesFileName: getFileName("types"),
      utilFileName: getFileName("util"),
      formattersTemplateFileName: getFileName("formatters-template"),
      typesTemplateFileName: getFileName("types-template"),
      ...config,
    } as GeneratorConfig,
    false,
  );

type FileToCheck = "types" | "util" | "util.sync" | "util.async" | "formatters-template" | "types-template" | "bun" | "react";

const FILES_TO_CHECK: FileToCheck[] = [
  "types",
  "util",
  "util.sync",
  "util.async",
  "formatters-template",
  "types-template",
  "bun",
  "react",
];

const getOutputFileName = (file: FileToCheck, type: "actual" | "expected") => {
  const ending = file === "react" ? ".tsx" : ".ts";
  if (file.endsWith("sync")) {
    const [base, part] = file.split(".");
    return `${base}.${type}.${part}${ending}`;
  }
  return `${file}.${type}${ending}`;
};

const readOrEmpty = async (path: string) => {
  const file = Bun.file(path);
  return (await file.exists()) ? file.text() : null;
};

const normalize = (content: string) => content.replace(/\t/g, "  ").trimEnd().split("\n");

const check = async (prefix: string, file: FileToCheck) => {
  const actualPath = join(outputPath, prefix, getOutputFileName(file, "actual"));
  const expectedPath = join(fixturesPath, prefix, getOutputFileName(file, "expected"));

  const actual = await readOrEmpty(actualPath);

  if (updateSnapshots) {
    if (actual !== null) await Bun.write(expectedPath, actual);
    else await rm(expectedPath, { force: true });
    return;
  }

  const expected = await readOrEmpty(expectedPath);

  if (expected === null && actual === null) return;
  if (expected === null || actual === null) {
    throw new Error(
      `'${file}' for '${prefix}' ${actual === null ? "was not generated" : "has no expected snapshot"} (${
        actual === null ? actualPath : expectedPath
      })`,
    );
  }

  expect(normalize(actual)).toEqual(normalize(expected));
};

const testGeneratedOutput = (
  prefix: string,
  translation: AnyBaseTranslation,
  config: GeneratorConfig = {},
  locales: Locale[] = [],
  namespaces: string[] = [],
) =>
  test(`generate ${prefix}`, async () => {
    const configWithDefaultValues = await createConfig(prefix, config);
    await generate(
      translation,
      configWithDefaultValues,
      silentLogger,
      true,
      locales.length ? locales : [configWithDefaultValues.baseLocale],
      namespaces,
    );

    for (const file of FILES_TO_CHECK) await check(prefix, file);
  });

// ---------------------------------------------------------------------------

type ConsoleOutputs = { info: string[]; warn: string[]; error: string[] };

const mockLogger = (): { logger: Logger; outputs: ConsoleOutputs } => {
  const outputs: ConsoleOutputs = { info: [], warn: [], error: [] };
  const push = (type: keyof ConsoleOutputs, ...messages: unknown[]) =>
    outputs[type].push(messages.join(" "));
  return {
    logger: {
      info: (...m) => push("info", ...m),
      warn: (...m) => push("warn", ...m),
      error: (...m) => push("error", ...m),
    },
    outputs,
  };
};

const testGeneratedConsoleOutput = (
  prefix: string,
  translation: AnyBaseTranslation,
  callback: (outputs: ConsoleOutputs) => void,
) =>
  test(`console ${prefix}`, async () => {
    const { logger, outputs } = mockLogger();
    await generate(translation, await createConfig(prefix, {}), logger);
    callback(outputs);
  });

// ---------------------------------------------------------------------------

describe("generator snapshots", () => {
  testGeneratedOutput("empty", {});

  testGeneratedOutput("simple", { TEST: "This is a test" });

  testGeneratedOutput("with-params", {
    PARAM: "{0} apple{{s}}",
    PARAMS: "{0} apple{{s}} and {1} banana{{s}}",
  });

  testGeneratedOutput("keyed-params", {
    KEYED_PARAM: "{nrOfApples} apple{{s}}",
    KEYED_PARAMS: "{nrOfApples} apple{{s}} and {nrOfBananas} banana{{s}}",
  });

  testGeneratedOutput("with-formatters", {
    FORMATTER_1: "{0|timesTen} apple{{s}}",
    FORMATTER_2: "{0} apple{{s}} and {1|wrapWithHtmlSpan} banana{{s}}",
  });

  testGeneratedOutput("formatters-with-dashes", { FORMATTER: "{0|custom-formatter|and-another}" });
  testGeneratedOutput("formatters-with-spaces", { FORMATTER: "{0| custom formatter | and another }" });
  testGeneratedOutput("formatter-chaining", { CHAINING: "{count:number|sqrt|round}" });

  testGeneratedOutput("base-locale-de", {}, { baseLocale: "de" });
  testGeneratedOutput("multiple-locales", {}, {}, ["de", "en", "it"]);
  testGeneratedOutput("locale-with-dash", {}, { baseLocale: "de-at" });
  testGeneratedOutput("locales-with-dash", {}, {}, ["it-it", "en-us", "fr-be"]);

  testGeneratedOutput("arg-types", { STRING_TYPE: "Hi {name:string}!", NUMBER_TYPE: "{0:number} apple{{s}}" });

  testGeneratedOutput("arg-order", {
    ORDER_INDEX: "{1} {0} {2} {0}",
    ORDER_KEYED: "{b} {z} {a}",
    ORDER_FORMATTER: "{0|z} {1|a}",
    ORDER_TYPES: "{0:B} {1:A}",
  });

  testGeneratedOutput("arg-type-localized-string", {
    localized: "Click on the button: <button>{buttonText:LocalizedString}</button>",
  });

  testGeneratedOutput("formatter-with-different-arg-types", { A: "{0:number|calculate}!", B: "{0:Date|calculate}" });

  testGeneratedOutput("formatter-with-multiple-usage", {
    A: "{0:number|calculate}!",
    B: "{0} {1:number|calculate}",
    C: "{0} {2:number|calculate} {1}",
  });

  testGeneratedOutput("arg-types-with-external-type", { EXTERNAL_TYPE: "The result is {0:Result|calculate}!" });

  testGeneratedOutput("same-param", { SAME_PARAM: "{0} {0} {0}" });
  testGeneratedOutput("same-keyed-param", { SAME_KEYED_PARAM: "{name} {name} {name}" });

  testGeneratedOutput("only-plural-rules", { ONLY_PLURAL: "apple{{s}}", ONLY_SINGULAR_PLURAL: "{{Apfel|Äpfel}}" });
  testGeneratedOutput("plural-part-before-key", { PLURAL_BEFORE_KEY: "apple{{s}}: {nrOfApples:number}" });
  testGeneratedOutput("plural-part-without-output", {
    PLURAL_WITHOUT_OUTPUT: "New message{{nrOfMessages:s}} in {inbox:InboxType}",
  });

  testGeneratedOutput("optional-parameters", {
    index: "Hi {0?}",
    keyed: "Hi {name?}",
    typed: "Hi {name?:string}",
    multiple: "Hi {name1?} and {name2?}",
    multiple1: "Hi {name1} and {name2?}",
    multiple2: "Hi {name1?} and {name2}",
    formatter: "Hi {name1?|uppercase}",
    sameArg: "Test {name?}, test {name?}, another test {name?}",
    sameArgWithRequiredParam: "{arg:string} Test {name?}, test {name?}, another test {name?}",
  });

  testGeneratedOutput("special-chars", {
    HI: "Hi {name:string}! */ Please leave a star if you like this project: https://github.com/ivanhofer/bun-i18n",
  });

  testGeneratedOutput(
    "generate-only-types",
    { TEST: "This is a test {0:CustomType|someFormatter}" },
    { generateOnlyTypes: true },
  );

  testGeneratedOutput(
    "uncommon-keys",
    {
      "*": "text",
      "": "text",
      0: "text",
      1234: "text",
      "a key": "text",
      "a/key": "text",
      "a\\key": "text",
      a_key: "text",
      "a-key": "text",
      'k"e"y': "text",
      "k'e'y": "text",
    },
    { generateOnlyTypes: true },
  );

  testGeneratedOutput("nested-deep", {
    a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: { m: "I am deeply nested" } } } } } } } } } } } },
  });

  testGeneratedOutput("nested-with-arguments", {
    a: { APPLES: "{0} apple{{s}}" },
    b: { APPLES: "{0:number} apple{{s}}" },
    c: { APPLES: "{nrOfApples:number} apple{{s}}" },
  });

  testGeneratedOutput("nested-formatters", {
    "some-key": { "other-key": "format {me:string|custom-formatter}" },
    "another-key": "{0|format}",
  });

  testGeneratedOutput("switch-case", {
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
  });

  testGeneratedOutput("arrays-root-strings", ["hello", "this is a test, {name: string}"]);
  testGeneratedOutput("arrays-root", [{ HI: "test" }]);
  testGeneratedOutput("arrays-nested", [["test 123"], [{ nested: { test: ["{name:string}", { a: "test" }] } }]]);

  testGeneratedOutput("banner-tslint", { HI: "Hi {0:name}" }, { banner: "/* tslint:disable */" });

  // adapters
  testGeneratedOutput("adapter-bun", { HELLO_NODE: "Hi {0:string}" }, { adapter: "bun", adapterFileName: getFileName("bun") });
  testGeneratedOutput("adapter-react", { HELLO_REACT: "Hi {0:string}" }, { adapter: "react", adapterFileName: getFileName("react") });
  testGeneratedOutput("adapters-empty", { HELLO: "Hi {0:string}" }, { adapters: [] });
  testGeneratedOutput("adapters-bun-react", { HELLO_NODE_REACT: "Hi {0:string}" }, { adapters: ["bun", "react"] });

  // namespaces
  testGeneratedOutput("namespaces", { wow: "some text", test: { hi: "hello" } }, {}, [], ["test"]);
  testGeneratedOutput("namespaces-only", { test: { hi: "hello" } }, {}, [], ["test"]);
  testGeneratedOutput(
    "namespaces-multiple",
    {
      wow: "some text",
      test: { hi: "hello" },
      a: ["some", "value"],
      "and-another": { b: { c: { d: { e: "heyyy" } } } },
      "x y": { b: "some long text" },
    },
    {},
    [],
    ["test", "a", "and-another", "x y"],
  );
  testGeneratedOutput(
    "namespaces-with-locales",
    { test: { hi: "hello" }, "some-other_namespace": { a: "abc" } },
    { baseLocale: "de" },
    ["en-us", "de_at", "it", "de"],
    ["test", "some-other_namespace"],
  );
});

describe("generator console output", () => {
  // info messages are only the "generated file" notices
  const onlyFileNotices = (outputs: ConsoleOutputs) =>
    outputs.info.every((message) => message.startsWith("generated file: "));

  testGeneratedConsoleOutput("console-no-translations", {}, (outputs) => {
    expect(onlyFileNotices(outputs)).toBe(true);
    expect(outputs.error.length).toBe(0);
    expect(outputs.warn.length).toBe(0);
  });

  testGeneratedConsoleOutput("console-wrong-index", { TEST: "{0} {2}" }, (outputs) => {
    expect(onlyFileNotices(outputs)).toBe(true);
    expect(outputs.warn.length).toBe(0);
    expect(outputs.error).toEqual([
      "translation 'TEST' => argument {1} expected, but {2} found. Make sure to not skip an index for your arguments.",
    ]);
  });

  testGeneratedConsoleOutput("console-keyed-and-index-based-keys", { TEST: "{hi} {0}" }, (outputs) => {
    expect(outputs.error).toEqual([
      "translation 'TEST' => argument {1} expected, but {hi} found. You can't mix keyed and index-based arguments.",
    ]);
  });

  testGeneratedConsoleOutput("console-translation-key-with-dot", { "i.am.wrongly.nested": "ohhh" }, (outputs) => {
    expect(outputs.error).toEqual([
      "translation 'i.am.wrongly.nested' => key can't contain the '.' character. Please remove it. If you want to nest keys, you should look at https://github.com/Wyesoftware/bun-i18n#nested-translations",
    ]);
  });

  testGeneratedConsoleOutput(
    "console-namespace-is-string",
    { test: "not an object" } satisfies BaseTranslation,
    (outputs) => {
      expect(outputs.error.length).toBe(0);
    },
  );
});
