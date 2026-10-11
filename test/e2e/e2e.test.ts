// End-to-end: import translations → run the CLI → type-check and execute the
// generated code against the library sources (TypeScript 7 via `paths`).
// The scratch project lives inside the repo so `node_modules` resolution works.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readTranslationsFromDisk } from "../../src/exporter";
import { silentLogger } from "../../src/generator/utils/logger";
import { storeTranslationsToDisk } from "../../src/importer";

const repoRoot = join(import.meta.dir, "..", "..");
const project = join(import.meta.dir, ".output", "project");
const i18nPath = join(project, "src", "i18n");

const en = {
  HI: "Hi {name:string}!",
  APPLES: "{0} apple{{s}}",
  PHOTO: "Added a photo to {gender|{male: his, female: her, *: their}} stream",
  nested: { deep: "nested {count:number|double}" },
  settings: { TITLE: "Settings" },
};
// non-base locales carry no type annotations, only keys and formatters
const de = {
  HI: "Hallo {name}!",
  APPLES: "{0} {{Apfel|Äpfel}}",
  PHOTO: "Foto zu {gender|{male: seinem, female: ihrem, *: deren}} Stream hinzugefügt",
  nested: { deep: "verschachtelt {count|double}" },
  settings: { TITLE: "Einstellungen" },
};

const toPosix = (path: string) => path.split("\\").join("/");

const writeProjectFiles = async () => {
  await Bun.write(
    join(project, ".bun-i18n.json"),
    JSON.stringify({ adapters: ["bun", "react"], outputPath: "./src/i18n/" }, null, 2),
  );

  const src = toPosix(relative(project, join(repoRoot, "src")));
  await Bun.write(
    join(project, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          lib: ["ESNext", "DOM"],
          target: "ESNext",
          module: "Preserve",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          noUncheckedIndexedAccess: true,
          exactOptionalPropertyTypes: true,
          types: ["bun", "react"],
          paths: {
            "@wyesoftware/bun-i18n": [`${src}/index.ts`],
            "@wyesoftware/bun-i18n/*": [`${src}/*/index.ts`],
          },
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );

  await Bun.write(
    join(project, "src", "usage.ts"),
    `import L from './i18n/i18n-bun'
import { i18nObject, isLocale } from './i18n/i18n-util'
import { loadLocaleAsync } from './i18n/i18n-util.async'

export const greeting: string = L.en.HI({ name: 'Bun' })
export const apples: string = L.de.APPLES(2)
export const photo: string = L.en.PHOTO({ gender: 'male' })
export const deep: string = L.en.nested.deep({ count: 2 })
export const settings: string = L.de.settings.TITLE()

// @ts-expect-error name must be a string
L.en.HI({ name: 1 })
// @ts-expect-error missing argument
L.en.HI()
// @ts-expect-error unknown key
L.en.UNKNOWN()
// @ts-expect-error count must be a number
L.en.nested.deep({ count: '2' })

if (isLocale('de')) i18nObject('de').HI({ name: 'x' })
export const load = () => loadLocaleAsync('de')
`,
  );

  await Bun.write(
    join(project, "src", "usage-react.tsx"),
    `import TypesafeI18n, { useI18nContext } from './i18n/i18n-react'

const Greeting = () => {
	const { LL, locale, setLocale } = useI18nContext()
	return <button lang={locale} onClick={() => setLocale('de')}>{LL.HI({ name: 'React' })}</button>
}

export const App = () => (
	<TypesafeI18n locale="en">
		<Greeting />
	</TypesafeI18n>
)
`,
  );
};

const runCli = async (...args: string[]) => {
  const proc = Bun.spawn(["bun", join(repoRoot, "src", "cli", "index.ts"), ...args], {
    cwd: project,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
};

beforeAll(async () => {
  await rm(project, { recursive: true, force: true });
  await mkdir(i18nPath, { recursive: true });
  await writeProjectFiles();
});

afterAll(async () => {
  await rm(join(import.meta.dir, ".output"), { recursive: true, force: true });
});

describe("end to end", () => {
  test("importer writes locale and namespace files", async () => {
    const config = { outputPath: `${i18nPath}/`, adapters: ["bun", "react"] as const };
    const locales = await storeTranslationsToDisk(
      [
        { locale: "en", translations: en, namespaces: ["settings"] },
        { locale: "de", translations: de, namespaces: ["settings"] },
      ],
      { config: { ...config, adapters: [...config.adapters] }, logger: silentLogger },
    );
    expect(locales).toEqual(["en", "de"]);

    for (const file of ["en/index.ts", "en/settings/index.ts", "de/index.ts", "de/settings/index.ts"]) {
      expect(await Bun.file(join(i18nPath, file)).exists()).toBe(true);
    }
    expect(await Bun.file(join(i18nPath, "en/index.ts")).text()).toContain("satisfies BaseTranslation");
    expect(await Bun.file(join(i18nPath, "de/settings/index.ts")).text()).toContain(
      "satisfies NamespaceSettingsTranslation",
    );
  });

  test("cli --no-watch generates every file from the config on disk", async () => {
    const { stdout, stderr, exitCode } = await runCli("--no-watch");
    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("generating files completed");

    for (const file of [
      "i18n-types.ts",
      "i18n-util.ts",
      "i18n-util.sync.ts",
      "i18n-util.async.ts",
      "formatters.ts",
      "i18n-bun.ts",
      "i18n-react.tsx",
    ]) {
      expect(await Bun.file(join(i18nPath, file)).exists()).toBe(true);
    }

    const types = await Bun.file(join(i18nPath, "i18n-types.ts")).text();
    expect(types).toContain("export type Locales =\n\t| 'de'\n\t| 'en'");
    expect(types).toContain("HI: RequiredParams<'name'>");
    expect(types).toContain("export type NamespaceSettingsTranslation");
    expect(types).toContain("double: (value: number) => unknown");
  });

  test("cli --version and --help", async () => {
    const version = await runCli("--version");
    expect(version.exitCode).toBe(0);
    expect(version.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);

    const help = await runCli("--help");
    expect(help.stdout).toContain("--no-watch");
  });

  test("generated code type-checks with the real TypeScript compiler", async () => {
    // the formatters template needs the `double` formatter the translations reference
    await Bun.write(
      join(i18nPath, "formatters.ts"),
      `import type { FormattersInitializer } from '@wyesoftware/bun-i18n'
import type { Locales, Formatters } from './i18n-types'

export const initFormatters: FormattersInitializer<Locales, Formatters> = (locale: Locales) => {
	const formatters: Formatters = {
		double: (value) => value * 2,
	}
	return formatters
}
`,
    );

    const proc = Bun.spawn(["bun", "x", "tsc", "-p", join(project, "tsconfig.json")], {
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(stdout + stderr).toBe("");
    expect(exitCode).toBe(0);
  }, 60_000);

  test("generated bun adapter works at runtime", async () => {
    const { default: L } = await import(join(i18nPath, "i18n-bun.ts"));
    expect(L.en.HI({ name: "Bun" })).toBe("Hi Bun!");
    expect(L.de.HI({ name: "Bun" })).toBe("Hallo Bun!");
    expect(L.en.APPLES(1)).toBe("1 apple");
    expect(L.de.APPLES(2)).toBe("2 Äpfel");
    expect(L.en.PHOTO({ gender: "female" })).toBe("Added a photo to her stream");
    expect(L.en.nested.deep({ count: 21 })).toBe("nested 42");
    expect(L.de.settings.TITLE()).toBe("Einstellungen");
  });

  test("generated react adapter works at runtime", async () => {
    const { loadAllLocales } = await import(join(i18nPath, "i18n-util.sync.ts"));
    loadAllLocales();
    const { default: TypesafeI18n, useI18nContext } = await import(join(i18nPath, "i18n-react.tsx"));

    const Greeting = () => {
      const { LL } = useI18nContext();
      return createElement("p", null, LL.HI({ name: "React" }));
    };

    const html = renderToString(
      createElement(TypesafeI18n, { locale: "de" }, createElement(Greeting)),
    );
    expect(html).toBe("<p>Hallo React!</p>");
  });

  test("exporter reads the locales back", async () => {
    const exported = await readTranslationsFromDisk({
      config: { outputPath: `${i18nPath}/` },
      logger: silentLogger,
    });
    const byLocale = Object.fromEntries(exported.map((entry) => [entry.locale, entry]));
    expect(byLocale.en?.namespaces).toEqual(["settings"]);
    expect(byLocale.en?.translations).toEqual(en);
    expect(byLocale.de?.translations).toEqual(de);
  });
});
