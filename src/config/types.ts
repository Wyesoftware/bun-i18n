import type { Locale } from "../runtime/core";

/**
 * - `bun`: server-side entry (`i18n-bun.ts`) that loads all locales eagerly.
 * - `react`: provider component + context (`i18n-react.tsx`).
 */
export type Adapter = "bun" | "react";

type NoAdaptersConfig = { adapter?: undefined; adapters?: undefined };
type SingleAdapterConfig = { adapter: Adapter; adapters?: undefined };
type MultipleAdaptersConfig = { adapter?: undefined; adapters: Adapter[] };
type AdapterConfig = NoAdaptersConfig | SingleAdapterConfig | MultipleAdaptersConfig;

/** Contents of `.bun-i18n.json`. */
export type GeneratorConfig = {
  $schema?: string;

  /** The locale the types are derived from. @default 'en' */
  baseLocale?: Locale;
  /** Where locale folders and generated files live. @default './src/i18n/' */
  outputPath?: string;
  /** @default 'i18n-types' */
  typesFileName?: string;
  /** @default 'i18n-util' */
  utilFileName?: string;
  /** @default 'formatters' */
  formattersTemplateFileName?: string;
  /** @default 'custom-types' */
  typesTemplateFileName?: string;

  /** Overrides the default adapter file name (`i18n-bun`, `i18n-react`). */
  adapterFileName?: string;
  /** Only write the types file, skip util, formatters and adapters. @default false */
  generateOnlyTypes?: boolean;

  /** First line(s) of every generated file. @default '/* eslint-disable *\/' */
  banner?: string;
  /** Shell command to run after each generation, e.g. a formatter. */
  runAfterGenerator?: string | undefined;
} & AdapterConfig;

export type GeneratorConfigWithDefaultValues = GeneratorConfig & {
  baseLocale: Locale;
  outputPath: string;
  typesFileName: string;
  utilFileName: string;
  formattersTemplateFileName: string;
  typesTemplateFileName: string;
  generateOnlyTypes: boolean;
  banner: string;
  runAfterGenerator: string | undefined;
};
