import { $ } from "bun";
import { resolve } from "node:path";
import { CONFIG_FILE_NAME, DEFAULT_CONFIG } from "../config/defaults";
import { doesConfigFileExist, writeConfigToFile } from "../config/read";
import type { Adapter, GeneratorConfig } from "../config/types";
import { PACKAGE_NAME, TOOL_NAME } from "../generator/output";
import { yellow } from "../generator/utils/colors";
import { logger } from "../generator/utils/logger";

type PackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const SCRIPT_NAME = "i18n";

const packageJsonPath = () => resolve("package.json");

const readPackageJson = async (): Promise<PackageJson | undefined> => {
  const file = Bun.file(packageJsonPath());
  return (await file.exists()) ? ((await file.json()) as PackageJson) : undefined;
};

const getDependencyList = (pkg: PackageJson): string[] => [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

// ---------------------------------------------------------------------------
// guessing
// ---------------------------------------------------------------------------

const guessAdapters = (dependencies: string[]): Adapter[] => {
  const adapters: Adapter[] = [];
  if (["react", "next", "react-dom"].some((dep) => dependencies.includes(dep))) adapters.push("react");
  if (["hono", "elysia", "express", "fastify"].some((dep) => dependencies.includes(dep))) adapters.push("bun");
  return adapters;
};

const withAdapters = (adapters: Adapter[]): Partial<GeneratorConfig> =>
  adapters.length === 0 ? {} : adapters.length === 1 ? { adapter: adapters[0] as Adapter } : { adapters };

export const getDefaultConfig = async (): Promise<GeneratorConfig> => {
  const pkg = await readPackageJson();
  const adapters = pkg ? guessAdapters(getDependencyList(pkg)) : [];

  return {
    baseLocale: DEFAULT_CONFIG.baseLocale,
    outputPath: DEFAULT_CONFIG.outputPath,
    ...withAdapters(adapters),
  } as GeneratorConfig;
};

// ---------------------------------------------------------------------------
// questions
// ---------------------------------------------------------------------------

const ask = (question: string, initial: string): string => {
  const answer = prompt(`${question} (${initial})`);
  return answer?.trim() || initial;
};

const askSelect = <T extends string>(
  question: string,
  choices: { title: string; value: T }[],
  initial: T,
): T => {
  const initialIndex = Math.max(
    0,
    choices.findIndex((choice) => choice.value === initial),
  );
  const list = choices.map((choice, index) => `  ${index + 1}) ${choice.title}`).join("\n");
  const answer = prompt(`${question}\n${list}\nChoice (${initialIndex + 1}):`);
  const index = Number.parseInt(answer?.trim() || "", 10) - 1;
  return (choices[index] ?? choices[initialIndex] ?? choices[0])?.value as T;
};

const askConfigQuestions = (defaults: GeneratorConfig): GeneratorConfig => {
  const baseLocale = ask("What is your base locale?", defaults.baseLocale || "en");

  const adapterChoice = askSelect<"none" | "bun" | "react" | "both">(
    "Which adapter do you want to use?",
    [
      { title: "None", value: "none" },
      { title: "Bun (server, APIs)", value: "bun" },
      { title: "React (browser)", value: "react" },
      { title: "Both", value: "both" },
    ],
    defaults.adapters ? "both" : (defaults.adapter ?? "none"),
  );
  const adapters: Adapter[] =
    adapterChoice === "none" ? [] : adapterChoice === "both" ? ["bun", "react"] : [adapterChoice];

  let outputPath = ask("Where do you want your locale files to be located?", defaults.outputPath || "./src/i18n/");
  if (!outputPath.startsWith("./")) outputPath = `./${outputPath}`;

  return { baseLocale, outputPath, ...withAdapters(adapters) } as GeneratorConfig;
};

const askOverride = (): boolean =>
  askSelect(
    `Config file '${CONFIG_FILE_NAME}' exists already. Do you want to override it?`,
    [
      { title: "No", value: "no" },
      { title: "Yes", value: "yes" },
    ],
    "no",
  ) === "yes";

// ---------------------------------------------------------------------------
// writing
// ---------------------------------------------------------------------------

/** Only values that differ from the defaults end up in the config file. */
const removeDefaultValues = (config: GeneratorConfig): GeneratorConfig =>
  Object.fromEntries(
    Object.entries(config).filter(
      ([key, value]) => value !== undefined && DEFAULT_CONFIG[key as keyof GeneratorConfig] !== value,
    ),
  ) as GeneratorConfig;

const detectIndentation = (content: string): string | number => {
  const match = content.match(/^(\t| +)"/m);
  return match?.[1]?.startsWith("\t") ? "\t" : (match?.[1]?.length ?? 2);
};

const installDependency = async (pkg: PackageJson): Promise<boolean> => {
  if (getDependencyList(pkg).includes(PACKAGE_NAME)) return true;

  logger.info(`installing '${PACKAGE_NAME}' ...`);
  const result = await $`bun add ${PACKAGE_NAME}`.nothrow();
  if (result.exitCode !== 0) {
    logger.error(`could not install '${PACKAGE_NAME}'. Please run 'bun add ${PACKAGE_NAME}' yourself.`);
    return false;
  }
  return true;
};

const addScript = async (): Promise<void> => {
  const content = await Bun.file(packageJsonPath()).text();
  const pkg = JSON.parse(content) as PackageJson;
  if (pkg.scripts?.[SCRIPT_NAME]) return;

  pkg.scripts = { ...pkg.scripts, [SCRIPT_NAME]: TOOL_NAME };
  await Bun.write(packageJsonPath(), `${JSON.stringify(pkg, undefined, detectIndentation(content))}\n`);
  logger.info(`'${SCRIPT_NAME}' script added to 'package.json'`);
};

/**
 * Creates `.bun-i18n.json`, installs the package and adds an `i18n` script.
 * With `autoSetup` nothing is asked; the config is guessed from `package.json`.
 */
export const setup = async (autoSetup: boolean): Promise<void> => {
  if (await doesConfigFileExist()) {
    if (autoSetup) {
      logger.warn(`Config file '${CONFIG_FILE_NAME}' exists already. Nothing to set up.`);
      return;
    }
    if (!askOverride()) {
      logger.info("setup aborted");
      return;
    }
  }

  if (!autoSetup) {
    logger.info(
      yellow("See https://github.com/Wyesoftware/bun-i18n#options for more information on all options"),
    );
  }

  const defaults = await getDefaultConfig();
  const answers = autoSetup ? defaults : askConfigQuestions(defaults);

  await writeConfigToFile(removeDefaultValues({ ...defaults, ...answers } as GeneratorConfig));
  logger.info(`generated config file: '${CONFIG_FILE_NAME}'`);

  const pkg = await readPackageJson();
  if (!pkg) {
    logger.warn(`no 'package.json' found. Run 'bun add ${PACKAGE_NAME}' inside your project to install it.`);
    return;
  }

  if (!(await installDependency(pkg))) return;
  await addScript();

  logger.info("setup complete");
  logger.info(yellow(`You can now run 'bun run ${SCRIPT_NAME}' to start the generator`));
};
