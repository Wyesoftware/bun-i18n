// Minimal ANSI helpers so the CLI has no dependency on a color library.
const useColors =
  typeof process !== "undefined" &&
  !process.env.NO_COLOR &&
  process.env.FORCE_COLOR !== "0" &&
  (!!process.env.FORCE_COLOR || !!process.stdout?.isTTY);

const wrap = (open: number, close: number) => (text: string) =>
  useColors ? `\x1b[${open}m${text}\x1b[${close}m` : text;

export const bold = wrap(1, 22);
export const red = wrap(31, 39);
export const yellow = wrap(33, 39);
