import { watch } from "node:fs";
import { getAllLocales } from "../config/locales";
import { getConfigWithDefaultValues } from "../config/read";
import type { GeneratorConfig, GeneratorConfigWithDefaultValues } from "../config/types";
import type { AnyBaseTranslation, BaseTranslation } from "../runtime/core";
import { generate } from "./generate-files";
import { parseLanguageFile } from "./parse-language-file";
import { createPathIfNotExists } from "./utils/file";
import { runCommandAfterGenerator } from "./utils/generator";
import { createLogger, type Logger } from "./utils/logger";
import { findAllNamespacesForLocale } from "./utils/namespaces";

const getBaseTranslations = async (
  { baseLocale, outputPath }: GeneratorConfigWithDefaultValues,
  namespaces: string[],
  logger: Logger,
): Promise<AnyBaseTranslation> => {
  const translations = (await parseLanguageFile(outputPath, baseLocale, logger)) || {};

  for (const namespace of namespaces) {
    (translations as Record<string, BaseTranslation>)[namespace] =
      ((await parseLanguageFile(outputPath, baseLocale, logger, namespace)) as BaseTranslation) || {};
  }

  return translations;
};

/** Reads the base locale from disk and writes all generated files once. */
export const parseAndGenerate = async (
  config: GeneratorConfigWithDefaultValues,
  logger: Logger,
): Promise<void> => {
  const { baseLocale, outputPath, runAfterGenerator } = config;

  const locales = await getAllLocales(outputPath);
  const namespaces = findAllNamespacesForLocale(baseLocale, outputPath);

  const firstLaunchOfGenerator = !locales.length;

  const translations = await getBaseTranslations(config, namespaces, logger);

  await generate(translations, config, logger, firstLaunchOfGenerator, locales, namespaces);

  if (firstLaunchOfGenerator) {
    let message =
      "Visit https://github.com/Wyesoftware/bun-i18n#options and configure 'bun-i18n' depending on your project-setup.";
    if (!config.adapter && !config.adapters) {
      message += " You probably want to set at least the 'adapter' option.";
    }
    logger.warn(message);
  }

  if (runAfterGenerator) await runCommandAfterGenerator(logger, runAfterGenerator);

  logger.info("... all files are up to date");
};

export type GeneratorHandle = {
  /** Stops watching. Resolves once the current run (if any) finished. */
  stop: () => Promise<void>;
};

/**
 * Runs the generator once, or keeps watching `outputPath` for changes.
 * Returns a handle to stop the watcher (no-op without `watchFiles`).
 */
export const startGenerator = async (
  config?: GeneratorConfig,
  watchFiles = true,
): Promise<GeneratorHandle> => {
  const logger = createLogger(console, !watchFiles);

  const configWithDefaultValues = await getConfigWithDefaultValues(config);
  const { outputPath } = configWithDefaultValues;

  await createPathIfNotExists(outputPath, logger);

  logger.info("options:", configWithDefaultValues);

  let running: Promise<void> = Promise.resolve();
  let generating = false;
  let changeDetectionPaused = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const run = async (isFirstRun: boolean) => {
    if (generating) return;
    generating = true;
    changeDetectionPaused = true;
    if (!isFirstRun) logger.info("files were modified => looking for changes ...");

    try {
      await parseAndGenerate(configWithDefaultValues, logger);
    } finally {
      generating = false;
      // the generator's own writes trigger the watcher: ignore them for a moment
      setTimeout(() => (changeDetectionPaused = false), 1000);
    }
  };

  const schedule = () => {
    if (changeDetectionPaused) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => (running = run(false)), 100);
  };

  const watcher = watchFiles
    ? watch(outputPath, { recursive: true }, () => schedule())
    : undefined;

  if (watcher) logger.info(`watcher started in: '${outputPath}'`);

  running = run(true);
  await running;

  if (!watchFiles) logger.info("generating files completed");

  return {
    stop: async () => {
      clearTimeout(debounceTimer);
      watcher?.close();
      await running;
    },
  };
};
