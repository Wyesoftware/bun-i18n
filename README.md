# @wyesoftware/bun-i18n

A fully type-safe and lightweight internationalization library for Bun projects, on the server and in React apps.

`bun-i18n` is a Bun-only rewrite of [typesafe-i18n](https://github.com/ivanhofer/typesafe-i18n). It keeps the translation syntax and the generator workflow, drops everything Node/CJS-specific and targets TypeScript 6 and 7.

- translations are plain TypeScript objects, the base locale defines the shape
- a generator derives types for every translation, including argument names, types, formatters and plurals
- the runtime is tiny: `Intl.PluralRules` and a `Proxy`, no dependencies
- works with `Bun.serve`, Hono, Elysia and friends on the server and with React in the browser

## Install

```sh
bun add @wyesoftware/bun-i18n
```

Requirements: Bun 1.4 or newer, TypeScript 6 or 7.

## Quick start

```sh
bunx bun-i18n --setup-auto
```

This creates `.bun-i18n.json`, adds an `i18n` script to `package.json` and guesses the adapter from your dependencies. The CLI is installed as `bun-i18n` and, for compatibility with existing scripts, as `typesafe-i18n`. Then start the generator in watch mode:

```sh
bun run i18n
```

On the first run it creates `src/i18n/en/index.ts` (the base locale) and `src/i18n/de/index.ts` as an example. Edit the base locale:

```ts
// src/i18n/en/index.ts
import type { BaseTranslation } from '../i18n-types'

const en = {
	HI: 'Hi {name:string}!',
	APPLES: '{0:number} apple{{s}}',
} satisfies BaseTranslation

export default en
```

Every other locale is checked against the base locale. Types are only written in the base locale; other locales use the plain `{name}` form:

```ts
// src/i18n/de/index.ts
import type { Translation } from '../i18n-types'

const de = {
	HI: 'Hallo {name}!',
	APPLES: '{0} {{Apfel|Äpfel}}',
} satisfies Translation

export default de
```

### Server (Bun)

With `"adapter": "bun"` the generator writes `src/i18n/i18n-bun.ts`, which loads every locale eagerly:

```ts
import L from './i18n/i18n-bun'
import { detectLocale } from './i18n/i18n-util'
import { initAcceptLanguageHeaderDetector } from '@wyesoftware/bun-i18n/detectors'

Bun.serve({
	fetch(request) {
		const locale = detectLocale(initAcceptLanguageHeaderDetector(request))
		return new Response(L[locale].HI({ name: 'Bun' }))
	},
})
```

### React (browser)

With `"adapter": "react"` the generator writes `src/i18n/i18n-react.tsx`:

```tsx
import { useEffect, useState } from 'react'
import TypesafeI18n, { useI18nContext } from './i18n/i18n-react'
import { loadLocaleAsync } from './i18n/i18n-util.async'

function Greeting() {
	const { LL, locale, setLocale } = useI18nContext()
	return <button onClick={() => setLocale('de')}>{LL.HI({ name: 'React' })}</button>
}

export function App() {
	const [loaded, setLoaded] = useState(false)
	useEffect(() => {
		loadLocaleAsync('en').then(() => setLoaded(true))
	}, [])
	if (!loaded) return null

	return (
		<TypesafeI18n locale="en">
			<Greeting />
		</TypesafeI18n>
	)
}
```

Use `"adapters": ["bun", "react"]` to generate both files.

## Translation syntax

| Syntax | Meaning |
| --- | --- |
| `Hello {name}` | keyed argument |
| `{0} and {1}` | index-based arguments, passed positionally |
| `{name:string}` | argument with a type (base locale only) |
| `{name?}` / `{name?:string}` | optional argument |
| `{price\|currency}` | formatter, defined in `formatters.ts` |
| `{price:number\|round\|currency}` | chained formatters, applied left to right |
| `{gender\|{male: his, female: her, *: their}}` | switch-case, `*` is the fallback |
| `apple{{s}}` | plural: nothing for one, `s` otherwise |
| `{{Apfel\|Äpfel}}` | singular \| plural |
| `{{zero\|one\|other}}` | three forms, `{{zero\|one\|two\|few\|many\|other}}` for all six |
| `{{count: one item\|?? items}}` | plural bound to a key, `??` inserts the value |

Plurals bind to the closest preceding argument (or the first one) and use `Intl.PluralRules` of the locale. Booleans pick the singular (`true`) or plural (`false`) form.

Supported argument types: `string`, `number`, `boolean`, `Date`, `bigint`, `object`, `undefined`, `null`, `LocalizedString`, arrays of those (`number[]`, `Array<number>`), and your own types exported from `custom-types.ts`.

## Runtime API

```ts
import { i18n, i18nObject, i18nString, typesafeI18nObject, typesafeI18nString } from '@wyesoftware/bun-i18n'
```

- `i18nString(locale, formatters?)` translates raw strings: `LLL('Hi {name}', { name: 'John' })`.
- `i18nObject(locale, translations, formatters?)` wraps a translation object so that every leaf is a function: `LL.HI({ name: 'John' })`.
- `i18n(translations, formatters?)` returns a lazily populated map of locale → translation functions: `L.en.HI(...)`.
- `typesafeI18nString` and `typesafeI18nObject` validate arguments against the translation string at compile time, without the generator:

```ts
const LL = typesafeI18nObject('en', {
	hi: 'Hi {name:string}',
	apples: '{0:number} apple{{s}}',
	photo: 'Added a photo to {gender|{male: his, female: her}} stream',
})

LL.hi({ name: 'John' })
LL.apples(3)              // index-based arguments as a tuple ...
LL.apples({ 0: 3 })       // ... or as an object
LL.photo({ gender: 'male' })
LL.photo({ gender: 'x' }) // error: '"x"' is not assignable to '"male" | "female"'
```

Argument validation is preserved on every nesting level.

## Generated files

| File | Content |
| --- | --- |
| `i18n-types.ts` | `Locales`, `Translations`, `TranslationFunctions`, `Formatters`, ... |
| `i18n-util.ts` | `locales`, `isLocale`, `loadedLocales`, `i18n()`, `i18nObject()`, `detectLocale()` |
| `i18n-util.sync.ts` | `loadLocale`, `loadAllLocales` with static imports |
| `i18n-util.async.ts` | `loadLocaleAsync`, `loadAllLocalesAsync`, `loadNamespaceAsync` with dynamic imports |
| `formatters.ts` | `initFormatters(locale)`, written once, maintained by you |
| `custom-types.ts` | written once, when a translation references an unknown type |
| `i18n-bun.ts` / `i18n-react.tsx` | adapters |

### Namespaces

A sub-folder of a locale with its own `index.ts` is a namespace, e.g. `src/i18n/en/settings/index.ts`. Namespaces are loaded separately with `loadNamespaceAsync(locale, 'settings')`.

### Formatters

```ts
// src/i18n/formatters.ts
import type { FormattersInitializer } from '@wyesoftware/bun-i18n'
import { date, number, uppercase } from '@wyesoftware/bun-i18n/formatters'
import type { Formatters, Locales } from './i18n-types'

export const initFormatters: FormattersInitializer<Locales, Formatters> = (locale: Locales) => {
	const formatters: Formatters = {
		currency: number(locale, { style: 'currency', currency: 'EUR' }),
		weekday: date(locale, { weekday: 'long' }),
		uppercase,
	}
	return formatters
}
```

Built-in formatter factories: `date`, `time`, `number`, `replace`, `identity`, `ignore`, `uppercase`, `lowercase`.

## Locale detection

```ts
import { detectLocale } from './i18n/i18n-util'
import { navigatorDetector, initAcceptLanguageHeaderDetector } from '@wyesoftware/bun-i18n/detectors'
```

Browser: `navigatorDetector`, `htmlLangAttributeDetector`, `documentCookieDetector`, `localStorageDetector`, `sessionStorageDetector`, `queryStringDetector` (each with an `init*Detector(key)` variant).

Server (work with the Web `Request`): `initAcceptLanguageHeaderDetector(request)`, `initRequestCookiesDetector(request)`, `initRequestHostnameDetector(request)`, `initRequestParametersDetector(request)`.

The first detector that returns a locale from `locales` wins; otherwise the base locale is used.

## Options

`.bun-i18n.json`:

| Option | Default | Description |
| --- | --- | --- |
| `baseLocale` | `"en"` | locale the types are derived from |
| `outputPath` | `"./src/i18n/"` | where locale folders and generated files live |
| `adapter` / `adapters` | | `"bun"`, `"react"` or an array of both |
| `adapterFileName` | `i18n-bun` / `i18n-react` | custom adapter file name |
| `typesFileName` | `"i18n-types"` | |
| `utilFileName` | `"i18n-util"` | |
| `formattersTemplateFileName` | `"formatters"` | |
| `typesTemplateFileName` | `"custom-types"` | |
| `generateOnlyTypes` | `false` | skip util, formatters and adapter files |
| `banner` | `"/* eslint-disable */"` | first line of generated files |
| `runAfterGenerator` | | shell command to run after each generation, e.g. a formatter |

## CLI

```
bun-i18n              watch outputPath and regenerate on changes
bun-i18n --no-watch   generate once (CI)
bun-i18n --setup      interactive setup
bun-i18n --setup-auto setup without questions
```

`typesafe-i18n` is an alias for the same binary, so scripts written for typesafe-i18n keep working.

## Importer and exporter

Exchange translations with a translation service without touching the TypeScript files by hand:

```ts
import { storeTranslationsToDisk } from '@wyesoftware/bun-i18n/importer'
import { readTranslationsFromDisk } from '@wyesoftware/bun-i18n/exporter'

const mappings = await readTranslationsFromDisk()
await storeTranslationsToDisk([{ locale: 'fr', translations: { HI: 'Salut {name}!' } }])
```

Both accept `{ config, logger }` options to override `.bun-i18n.json`. `@wyesoftware/bun-i18n/generator` exposes `startGenerator` and `generate` for custom build scripts, and `@wyesoftware/bun-i18n/config` reads the config file.

## Differences from typesafe-i18n

- Bun only. ESM only. No framework adapters besides React, no Deno/Node/JSDoc output modes, no `esmImports`/`outputFormat`/`tempPath` options.
- The base locale is imported directly by Bun; no TypeScript compiler step, so the generator starts instantly.
- Index-based arguments are typed as tuples (`LL.APPLES(3)`), nested translation objects keep full argument typing, and switch-case values may contain `:`.
- `extendDictionary` performs a real deep merge.
- Browser detectors are safe to import on the server; server detectors accept a Web `Request`.
- Package is `@wyesoftware/bun-i18n`, config file is `.bun-i18n.json`, the CLI is `bun-i18n`.

## Development

```sh
bun install
bun test             # unit, snapshot and end-to-end tests
bun run typecheck    # TypeScript 7
bun run build        # dist/ with declarations
```

Snapshot fixtures live in `test/generator/fixtures`; run `UPDATE_SNAPSHOTS=1 bun test test/generator` to accept new output.

## License

MIT
