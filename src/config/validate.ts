import { red, yellow } from "../generator/utils/colors";
import type { Adapter, GeneratorConfig } from "./types";

export const ADAPTERS: readonly Adapter[] = ["bun", "react"];

type Rule =
  | { type: "string" }
  | { type: "boolean" }
  | { type: "enum"; values: readonly string[] }
  | { type: "enum[]"; values: readonly string[] };

const RULES: Record<keyof GeneratorConfig, Rule> = {
  $schema: { type: "string" },
  baseLocale: { type: "string" },
  outputPath: { type: "string" },
  typesFileName: { type: "string" },
  utilFileName: { type: "string" },
  formattersTemplateFileName: { type: "string" },
  typesTemplateFileName: { type: "string" },
  adapter: { type: "enum", values: ADAPTERS },
  adapters: { type: "enum[]", values: ADAPTERS },
  adapterFileName: { type: "string" },
  generateOnlyTypes: { type: "boolean" },
  banner: { type: "string" },
  runAfterGenerator: { type: "string" },
};

const quote = (values: readonly string[]) =>
  values.map((v) => `'${v}'`).join(", ");

const checkValue = (key: string, value: unknown, rule: Rule): string[] => {
  if (value === undefined) return [];

  switch (rule.type) {
    case "string":
    case "boolean":
      return typeof value === rule.type ? [] : [`'${key}' should be ${rule.type}`];
    case "enum":
      return rule.values.includes(value as string)
        ? []
        : [`'${key}' should be equal to one of the allowed values: ${quote(rule.values)}`];
    case "enum[]":
      if (!Array.isArray(value)) return [`'${key}' should be array`];
      return value
        .filter((entry) => !rule.values.includes(entry))
        .map(
          (entry) =>
            `'${key}' contains '${entry}' which is not one of the allowed values: ${quote(rule.values)}`,
        );
  }
};

/** Returns a list of human readable problems; empty when the config is valid. */
export const getConfigErrors = (config: unknown): string[] => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return ["config should be an object"];
  }

  const errors: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    const rule = RULES[key as keyof GeneratorConfig];
    if (!rule) {
      errors.push(`should NOT have additional properties: ${key}`);
      continue;
    }
    errors.push(...checkValue(key, value, rule));
  }

  const { adapter, adapters } = config as GeneratorConfig;
  if (adapter !== undefined && adapters !== undefined) {
    errors.push("'adapter' and 'adapters' can't be used together");
  }

  return errors;
};

const NEW_LINE = "\n - ";

/** Throws a descriptive error when the config contains unknown or mistyped options. */
export function validateConfig(config: unknown): asserts config is GeneratorConfig {
  const errors = getConfigErrors(config);
  if (!errors.length) return;

  throw new Error(
    red(
      `\nYour 'bun-i18n' config contains following errors:${NEW_LINE}${errors.join(NEW_LINE)}\n`,
    ) +
      yellow(
        "\nSee here for all available options: https://github.com/Wyesoftware/bun-i18n#options\n",
      ),
  );
}
