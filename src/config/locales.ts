import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Locale } from "../runtime/core";

const LOCALE_FILE = "index.ts";

/** Folders directly inside `outputPath` that contain an `index.ts`. */
export const getAllLocales = async (outputPath: string): Promise<Locale[]> => {
  const entries = await readdir(outputPath, { withFileTypes: true }).catch(
    () => [],
  );

  const locales: Locale[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await Bun.file(join(outputPath, entry.name, LOCALE_FILE)).exists()) {
      locales.push(entry.name);
    }
  }
  return locales;
};

/** Sub-folders of `outputPath/<locale>` that contain an `index.ts`. */
export const findAllNamespacesForLocale = (
  locale: Locale,
  outputPath: string,
): string[] => {
  const cwd = join(outputPath, locale);
  try {
    return Array.from(
      new Bun.Glob(`*/${LOCALE_FILE}`).scanSync({ cwd, onlyFiles: true }),
    )
      .map((file) => file.replace(/\\/g, "/").split("/")[0] ?? "")
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
};
