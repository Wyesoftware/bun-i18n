import type { GeneratorConfig, GeneratorConfigWithDefaultValues } from "./types";

export const CONFIG_FILE_NAME = ".bun-i18n.json";

export const DEFAULT_CONFIG: GeneratorConfigWithDefaultValues = {
  baseLocale: "en",
  outputPath: "./src/i18n/",
  typesFileName: "i18n-types",
  utilFileName: "i18n-util",
  formattersTemplateFileName: "formatters",
  typesTemplateFileName: "custom-types",
  adapter: undefined,
  generateOnlyTypes: false,
  banner: "/* eslint-disable */",
  runAfterGenerator: undefined,
};

export const applyDefaultValues = (
  config: GeneratorConfig | undefined = {},
): GeneratorConfigWithDefaultValues =>
  ({
    ...DEFAULT_CONFIG,
    ...config,
  }) as GeneratorConfigWithDefaultValues;
