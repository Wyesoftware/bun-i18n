import type { BuildConfig } from "bun";
import { $ } from "bun";

// Every subpath export in package.json has a matching entrypoint here.
// Browser entrypoints are used by React apps, so they are built for the
// browser; tooling entrypoints run inside Bun only.
const browserEntrypoints = [
  "index",
  "parser/index",
  "formatters/index",
  "detectors/index",
  "utils/index",
  "react/index",
];
const bunEntrypoints = [
  "config/index",
  "generator/index",
  "importer/index",
  "exporter/index",
];

const toPath = (entry: string) => `./src/${entry}.ts`;

const defaultBuildConfig: BuildConfig = {
  entrypoints: [],
  root: "./src",
  outdir: "./dist",
  format: "esm",
  minify: true,
  external: ["react"],
};

const report = (
  label: string,
  result: Awaited<ReturnType<typeof Bun.build>>,
) => {
  for (const log of result.logs) console.error(log);
  if (!result.success) {
    console.error(`[build] ${label} failed`);
    process.exit(1);
  }
  console.log(`[build] ${label}: ${result.outputs.length} file(s)`);
};

// Library: one output per subpath, shared code goes into chunks.
report(
  "browser library",
  await Bun.build({
    ...defaultBuildConfig,
    entrypoints: browserEntrypoints.map(toPath),
    target: "browser",
    splitting: true,
    naming: {
      entry: "[dir]/[name].js",
      chunk: "chunks/[name]-[hash].js",
    },
  }),
);

report(
  "bun library",
  await Bun.build({
    ...defaultBuildConfig,
    entrypoints: bunEntrypoints.map(toPath),
    target: "bun",
    splitting: true,
    naming: {
      entry: "[dir]/[name].js",
      chunk: "chunks/[name]-[hash].js",
    },
  }),
);

// CLI: standalone bundle with a bun shebang.
report(
  "cli",
  await Bun.build({
    ...defaultBuildConfig,
    entrypoints: [toPath("cli/index")],
    target: "bun",
    naming: "[dir]/[name].js",
    banner: "#!/usr/bin/env bun",
  }),
);

// Type declarations next to each output file.
await $`tsc -p tsconfig.build.json`;
console.log("[build] declarations emitted");
