import { describe, expect, test } from "bun:test";
import { createElement, useEffect, type FunctionComponent } from "react";
import { renderToString } from "react-dom/server";
import { initI18nReact } from "./index";

const translations = {
  en: { hi: "Hi {name}", apples: "{0} apple{{s}}" },
  de: { hi: "Hallo {name}", apples: "{0} {{Apfel|Äpfel}}" },
};
type Locales = keyof typeof translations;

describe("initI18nReact", () => {
  const { component: TypesafeI18n, useI18nContext } = initI18nReact<
    Locales,
    (typeof translations)[Locales]
  >(translations);

  const Greeting: FunctionComponent<{ name: string; count: number }> = ({
    name,
    count,
  }) => {
    const { LL, locale } = useI18nContext();
    return createElement(
      "p",
      { lang: locale },
      `${LL.hi({ name })} / ${LL.apples(count)}`,
    );
  };

  test("renders translations for the given locale", () => {
    const html = renderToString(
      createElement(
        TypesafeI18n,
        { locale: "en" },
        createElement(Greeting, { name: "John", count: 2 }),
      ),
    );
    expect(html).toBe('<p lang="en">Hi John / 2 apples</p>');
  });

  test("locale decides translations and plural rules", () => {
    const html = renderToString(
      createElement(
        TypesafeI18n,
        { locale: "de" },
        createElement(Greeting, { name: "John", count: 1 }),
      ),
    );
    expect(html).toBe('<p lang="de">Hallo John / 1 Apfel</p>');
  });

  test("exposes setLocale through the context", () => {
    let setLocaleType = "";
    const Probe: FunctionComponent = () => {
      const ctx = useI18nContext();
      setLocaleType = typeof ctx.setLocale;
      useEffect(() => {}, []);
      return null;
    };
    renderToString(
      createElement(TypesafeI18n, { locale: "en" }, createElement(Probe)),
    );
    expect(setLocaleType).toBe("function");
  });

  test("falls back to empty strings when no locale is set", () => {
    const html = renderToString(
      createElement(
        TypesafeI18n,
        { locale: "" as Locales },
        createElement(Greeting, { name: "John", count: 2 }),
      ),
    );
    expect(html).toBe('<p lang=""> / </p>');
  });
});
