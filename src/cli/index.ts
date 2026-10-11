import { parseArgs } from "node:util";
import { startGenerator } from "../generator/generator";
import { logger } from "../generator/utils/logger";
import { setup } from "./setup";

const HELP = `Usage: bun-i18n [options]

Reads the base locale file and generates types and util files.

Options:
  --no-watch    run the generator only once (CI)
  --setup       step-by-step setup
  --setup-auto  auto-guess setup
  -v, --version print the version
  -h, --help    print this help
`;

const getVersion = async (): Promise<string> => {
  // dist/cli/index.js and src/cli/index.ts are both two levels below the package root
  const pkg = (await Bun.file(new URL("../../package.json", import.meta.url)).json()) as { version: string };
  return pkg.version;
};

const run = async () => {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      watch: { type: "boolean", default: true },
      "no-watch": { type: "boolean", default: false },
      setup: { type: "boolean", default: false },
      "setup-auto": { type: "boolean", default: false },
      version: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const version = await getVersion();
  if (values.version) {
    console.log(version);
    return;
  }

  logger.info(`version ${version}`);

  if (values.setup || values["setup-auto"]) {
    await setup(values["setup-auto"]);
    return;
  }

  await startGenerator(undefined, !values["no-watch"]);
};

run().catch((error) => {
  logger.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
