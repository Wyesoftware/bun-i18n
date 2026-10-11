import { resolve } from "node:path";
import { doesPathExist } from "../generator/utils/file";
import { applyDefaultValues, CONFIG_FILE_NAME } from "./defaults";
import type { GeneratorConfig, GeneratorConfigWithDefaultValues } from "./types";
import { validateConfig } from "./validate";

const configFilePath = () => resolve(CONFIG_FILE_NAME);

export const doesConfigFileExist = (): Promise<boolean> =>
  doesPathExist(configFilePath());

/** Reads `.bun-i18n.json` from the current working directory; `{}` if missing. */
export const readRawConfig = async (): Promise<GeneratorConfig> => {
  const file = Bun.file(configFilePath());
  if (!(await file.exists())) return {};
  return (await file.json()) as GeneratorConfig;
};

/** Reads and validates the config file; the `$schema` property is dropped. */
export const readConfig = async (): Promise<GeneratorConfig> => {
  const { $schema: _schema, ...config } = await readRawConfig();
  validateConfig(config);
  return config;
};

export const writeConfigToFile = async (config: GeneratorConfig): Promise<void> => {
  await Bun.write(configFilePath(), `${JSON.stringify(config, undefined, 2)}\n`);
};

/**
 * Merges the given config over the one on disk (unless disabled) and fills
 * in the defaults.
 */
export const getConfigWithDefaultValues = async (
  config?: GeneratorConfig | undefined,
  shouldReadConfigFromDisk = true,
): Promise<GeneratorConfigWithDefaultValues> =>
  applyDefaultValues({
    ...(shouldReadConfigFromDisk ? await readConfig() : {}),
    ...config,
  } as GeneratorConfig);
