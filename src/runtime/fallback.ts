import type { TranslationFunctions } from "./core";

/**
 * A translation object that returns `''` for every key at any depth and `0`
 * for `length`. Useful as a placeholder until the real locale is loaded.
 */
// biome-ignore lint/suspicious/noExplicitAny: shape is decided by the caller
export const getFallbackProxy = <TF extends TranslationFunctions<any>>(): TF =>
  new Proxy(Object.assign(() => "", {}) as unknown as TF, {
    get: (_target, key) => (key === "length" ? 0 : getFallbackProxy()),
  });
