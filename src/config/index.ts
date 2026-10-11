import { getAllLocales } from "./locales";
import { getConfigWithDefaultValues } from "./read";
import type { GeneratorConfigWithDefaultValues } from "./types";

export type {
  Adapter,
  GeneratorConfig,
  GeneratorConfigWithDefaultValues,
} from "./types";
export { CONFIG_FILE_NAME, DEFAULT_CONFIG } from "./defaults";
export { getConfigErrors, validateConfig } from "./validate";
export { getAllLocales, findAllNamespacesForLocale } from "./locales";

/** The config from `.bun-i18n.json` with defaults applied. */
export const getConfig = (): Promise<GeneratorConfigWithDefaultValues> =>
  getConfigWithDefaultValues();

/** The base locale and every locale folder found in `outputPath`. */
export const getLocaleInformation = async (): Promise<{
  base: string;
  locales: string[];
}> => {
  const config = await getConfig();
  return {
    base: config.baseLocale,
    locales: await getAllLocales(config.outputPath),
  };
};
