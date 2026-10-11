// Type-level parser for the translation syntax.
// Given a translation string literal it derives the argument list a
// translation function accepts, so mistakes are caught by the compiler.

import type { LocalizedString } from "./core";

// ---------------------------------------------------------------------------
// string helpers
// ---------------------------------------------------------------------------

type Whitespace = " " | "\n" | "\t";
type TrimL<S extends string> = S extends `${Whitespace}${infer R}`
  ? TrimL<R>
  : S;
type TrimR<S extends string> = S extends `${infer L}${Whitespace}`
  ? TrimR<L>
  : S;
export type Trim<S extends string> = TrimR<TrimL<S>>;

/** Flattens an intersection of records into a single object type. */
type Simplify<T> = { [K in keyof T]: T[K] } & {};

// ---------------------------------------------------------------------------
// argument types (`{key:type}`)
// ---------------------------------------------------------------------------

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  Date: Date;
  bigint: bigint;
  object: object;
  undefined: undefined;
  null: null;
  LocalizedString: LocalizedString;
  unknown: unknown;
};

export type DetectType<Type extends string> = Type extends `${infer Inner}[]`
  ? DetectType<Inner>[]
  : Type extends `Array<${infer Inner}>`
    ? DetectType<Inner>[]
    : Type extends keyof TypeMap
      ? TypeMap[Type]
      : unknown;

// ---------------------------------------------------------------------------
// switch-case (`{key|{a: x, b: y, *: z}}`)
// ---------------------------------------------------------------------------

// A segment without `:` is the continuation of a value that contained a comma.
type CaseKey<Definition extends string> =
  Definition extends `${infer Key}:${string}`
    ? Trim<Key> extends "*"
      ? string
      : Trim<Key>
    : never;

type CaseKeys<
  Definitions extends string,
  Acc = never,
> = Definitions extends `${infer First},${infer Rest}`
  ? CaseKeys<Rest, Acc | CaseKey<First>>
  : Acc | CaseKey<Definitions>;

// Only untyped or string-typed arguments are narrowed to the case keys.
type NarrowByCases<Type, Cases extends string> = unknown extends Type
  ? Cases
  : [Type] extends [string]
    ? Cases
    : Type;

// ---------------------------------------------------------------------------
// pipes (`{key|formatter|{switch: case}|formatter}`)
// ---------------------------------------------------------------------------

export type UnknownFormatter<Name extends string> =
  `unknown Formatter '${Name}'`;

type StripLeadingPipe<S extends string> = S extends `|${infer Rest}`
  ? Trim<Rest>
  : Trim<S>;

/**
 * Applies a pipe chain to the argument type.
 * Only a switch-case that comes before any formatter can narrow the input,
 * a later one operates on the formatter output instead.
 */
type ApplyPipes<
  Piped extends string,
  Formatters extends PropertyKey,
  Type,
  CanNarrow extends boolean = true,
> = Piped extends ""
  ? Type
  : Piped extends `{${infer Cases}}${infer Rest}`
    ? ApplyPipes<
        StripLeadingPipe<Rest>,
        Formatters,
        CanNarrow extends true ? NarrowByCases<Type, CaseKeys<Cases>> : Type,
        false
      >
    : Piped extends `${infer Pipe}|${infer Rest}`
      ? Trim<Pipe> extends Formatters
        ? ApplyPipes<Trim<Rest>, Formatters, Type, false>
        : UnknownFormatter<Trim<Pipe>>
      : Trim<Piped> extends Formatters
        ? Type
        : UnknownFormatter<Trim<Piped>>;

// ---------------------------------------------------------------------------
// single argument → record
// ---------------------------------------------------------------------------

type ArgRecord<Key extends string, Type> = Key extends ""
  ? {}
  : Key extends `${infer Optional}?`
    ? { [k in Trim<Optional>]?: Type | undefined }
    : { [k in Key]: Type };

type SplitKeyAndType<KeyAndType extends string> =
  KeyAndType extends `${infer Key}:${infer Type}`
    ? [Trim<Key>, DetectType<Trim<Type>>]
    : [Trim<KeyAndType>, unknown];

type ArgFromContent<
  Content extends string,
  Formatters extends PropertyKey,
> = Content extends `${infer KeyAndType}|${infer Piped}`
  ? SplitKeyAndType<KeyAndType> extends [infer Key extends string, infer Type]
    ? ArgRecord<Key, ApplyPipes<Trim<Piped>, Formatters, Type>>
    : never
  : SplitKeyAndType<Content> extends [infer Key extends string, infer Type]
    ? ArgRecord<Key, Type>
    : never;

// A plural with an explicit key (`{{key: one|other}}`) introduces that key.
type PluralArg<Content extends string> =
  Content extends `${infer Key}:${string}` ? { [k in Trim<Key>]: unknown } : {};

// ---------------------------------------------------------------------------
// tokenizer
// ---------------------------------------------------------------------------

// Tail-recursive so long translations do not hit the instantiation depth limit.
type CollectArgs<
  Translation extends string,
  Formatters extends PropertyKey,
  Acc = {},
> = Translation extends `${string}{${infer Rest}`
  ? ParseBrace<Rest, Formatters, Acc>
  : Acc;

// `Rest` starts right after an opening `{`.
type ParseBrace<
  Rest extends string,
  Formatters extends PropertyKey,
  Acc,
> = Rest extends `{${infer Plural}}}${infer After}`
  ? CollectArgs<After, Formatters, Acc & PluralArg<Plural>>
  : Rest extends `${infer Content}}${infer After}`
    ? Content extends `${string}{${string}`
      ? // the first `}` closed a nested switch-case, the real one is the next `}`
        After extends `${infer MorePipes}}${infer AfterSwitch}`
        ? CollectArgs<
            AfterSwitch,
            Formatters,
            Acc & ArgFromContent<`${Content}}${MorePipes}`, Formatters>
          >
        : Acc
      : CollectArgs<After, Formatters, Acc & ArgFromContent<Content, Formatters>>
    : Acc;

type HasPlural<Translation extends string> =
  Translation extends `${string}{{${string}}}${string}` ? true : false;

// ---------------------------------------------------------------------------
// record → argument list
// ---------------------------------------------------------------------------

type IsOptionalKey<R, K extends keyof R> = {} extends Pick<R, K> ? true : false;

/**
 * `{ "0": A, "1"?: B }` → `[A, B?]`
 * Stops for index signatures, `any` and deferred generics, which would
 * otherwise grow the tuple forever.
 */
type IndexTuple<R, Acc extends unknown[] = []> = string extends keyof R
  ? []
  : number extends keyof R
    ? []
    : Acc["length"] extends 32
      ? Acc
      : `${Acc["length"]}` extends infer K extends keyof R
        ? IsOptionalKey<R, K> extends true
          ? IndexTuple<R, [...Acc, Exclude<R[K], undefined>?]>
          : IndexTuple<R, [...Acc, R[K]]>
        : Acc;

type ArgsFromRecord<R, Plural extends boolean> = keyof R extends never
  ? Plural extends true
    ? [unknown]
    : []
  : "0" extends keyof R
    ? [R] | IndexTuple<R>
    : [R];

/**
 * The arguments a translation function accepts.
 *
 * - `'Hello'` → `[]`
 * - `'Hi {name:string}'` → `[{ name: string }]`
 * - `'{0} and {1:number}'` → `[{ 0: unknown; 1: number }] | [unknown, number]`
 * - `'apple{{s}}'` → `[unknown]`
 * - `'{a|missing}'` → `[{ a: "unknown Formatter 'missing'" }]`
 */
export type Args<
  Translation extends string,
  Formatters extends PropertyKey = never,
> = string extends Translation
  ? // not a literal: nothing can be validated
    unknown[]
  : Translation extends `${string}{${string}}${string}`
    ? ArgsFromRecord<
        Simplify<CollectArgs<Translation, Formatters>>,
        HasPlural<Translation>
      >
    : [];

// ---------------------------------------------------------------------------
// RequiredParams (used by generated `Translation` types)
// ---------------------------------------------------------------------------

type Permutation<T extends string, U extends string = T> = [T] extends [never]
  ? Array<string>
  : T extends U
    ? [T, ...Permutation<Exclude<U, T>>]
    : [T];

type WrapParam<P> = P extends string ? `{${P}}` : never;

type ConstructString<Params extends unknown[]> = Params extends []
  ? `${string}`
  : Params extends [infer Param, ...infer Rest]
    ? `${string}${WrapParam<Param>}${ConstructString<Rest>}`
    : Params extends string
      ? Params
      : `${string}`;

/**
 * A string type that must contain every given `{param}` in any order.
 * Example: `RequiredParams<'name' | 'count'>`
 */
export type RequiredParams<Params extends string> = ConstructString<
  Permutation<Params>
>;
