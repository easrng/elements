/* THIS FILE IS UNUSED BECAUSE TYPESCRIPT DOESN'T PASS CONSTANT TEMPLATE STRING STATICS */
/* eslint-disable @typescript-eslint/ban-types */
import type {
  Pipe,
  Tuples,
  Fn,
  ComposeLeft,
  Call,
  Numbers,
  Strings,
  Booleans,
  Match,
} from 'hotscript';

enum Mode {
  SLASH = 0,
  TEXT = 1,
  WHITESPACE = 2,
  TAGNAME = 3,
  COMMENT = 4,
  PROP_SET = 5,
  PROP_APPEND = 6,
}

type StateType = {
  mode: Mode;
  buffer: string;
  quote: '' | '"' | "'";
  i: number;
  holes: Mode[];
  nesting: number;
};
type ValidState<T extends StateType> = T;
type StateString = [StateType, string];

type Impl$1<State extends StateType> = ValidState<{
  mode: State['mode'];
  buffer: State['buffer'];
  quote: State['quote'];
  i: Call<Numbers.Add<1, State['i']>>;
  holes: State['holes'];
  nesting: State['nesting'];
}>;
interface IncrementI extends Fn {
  return: this['arg0'] extends StateString
    ? [Impl$1<this['arg0'][0]>, this['arg0'][1]]
    : never;
}

type ImplProcessChar<
  State extends StateType,
  Char extends string,
  Next extends string | undefined,
> = State['mode'] extends Mode.TEXT
  ? Char extends '<'
    ? ValidState<{
        mode: Mode.TAGNAME;
        buffer: '';
        quote: State['quote'];
        i: State['i'];
        holes: State['holes'];
        nesting: Next extends '/'
          ? State['nesting']
          : Call<Numbers.Add, State['nesting'], 1>;
      }>
    : ValidState<{
        mode: State['mode'];
        buffer: `${State['buffer']}${Char}`;
        quote: State['quote'];
        i: State['i'];
        holes: State['holes'];
        nesting: State['nesting'];
      }>
  : State['mode'] extends Mode.COMMENT
    ? Call<
        Booleans.And,
        Call<Booleans.Equals<State['buffer'], '--'>>,
        Call<Booleans.Equals<Char, '>'>>
      > extends true
      ? ValidState<{
          mode: Mode.TEXT;
          buffer: '';
          quote: State['quote'];
          i: State['i'];
          holes: State['holes'];
          nesting: Call<Numbers.Sub, State['nesting'], 1>;
        }>
      : ValidState<{
          mode: State['mode'];
          buffer: `${Char}${Call<Strings.Slice<0, 1>, State['buffer']>}`;
          quote: State['quote'];
          i: State['i'];
          holes: State['holes'];
          nesting: State['nesting'];
        }>
    : Pipe<
          never,
          [Booleans.Equals<State['quote'], ''>, Booleans.Not]
        > extends true
      ? Char extends State['quote']
        ? ValidState<{
            mode: State['mode'];
            buffer: State['buffer'];
            quote: '';
            i: State['i'];
            holes: State['holes'];
            nesting: State['nesting'];
          }>
        : ValidState<{
            mode: State['mode'];
            buffer: `${State['buffer']}${Char}`;
            quote: State['quote'];
            i: State['i'];
            holes: State['holes'];
            nesting: State['nesting'];
          }>
      : Char extends "'" | '"'
        ? ValidState<{
            mode: State['mode'];
            buffer: State['buffer'];
            quote: Char;
            i: State['i'];
            holes: State['holes'];
            nesting: State['nesting'];
          }>
        : Char extends '>'
          ? ValidState<{
              mode: Mode.TEXT;
              buffer: '';
              quote: State['quote'];
              i: State['i'];
              holes: State['holes'];
              nesting: State['nesting'];
            }>
          : State['mode'] extends Mode.SLASH
            ? State
            : Char extends '='
              ? ValidState<{
                  mode: Mode.PROP_SET;
                  buffer: '';
                  quote: State['quote'];
                  i: State['i'];
                  holes: State['holes'];
                  nesting: State['nesting'];
                }>
              : Call<
                    Booleans.And<
                      Call<Booleans.Equals<Char, '/'>>,
                      Call<
                        Booleans.Or<
                          Call<
                            Booleans.Extends<
                              State['mode'],
                              Mode.TAGNAME | Mode.WHITESPACE
                            >
                          >,
                          Call<Booleans.Equals<Next, '>'>>
                        >
                      >
                    >
                  > extends true
                ? ValidState<{
                    mode: Mode.SLASH;
                    buffer: '';
                    quote: State['quote'];
                    i: State['i'];
                    holes: State['holes'];
                    nesting: Call<Numbers.Sub, State['nesting'], 1>;
                  }>
                : Char extends ' ' | '\t' | '\n' | '\r'
                  ? ValidState<{
                      mode: Mode.WHITESPACE;
                      buffer: '';
                      quote: State['quote'];
                      i: State['i'];
                      holes: State['holes'];
                      nesting: State['nesting'];
                    }>
                  : ValidState<{
                      mode: State['mode'];
                      buffer: `${State['buffer']}${Char}`;
                      quote: State['quote'];
                      i: State['i'];
                      holes: State['holes'];
                      nesting: State['nesting'];
                    }>;
interface ProcessChar extends Fn {
  return: this['arg0'] extends StateType
    ? this['arg1'] extends [string, string | undefined]
      ? CommentCheck<
          ImplProcessChar<this['arg0'], this['arg1'][0], this['arg1'][1]>
        >
      : never
    : never;
}

type Chars<InputString extends string> = Call<Strings.Split<''>, InputString>;
type Nextify<Array extends unknown[]> = Array extends []
  ? []
  : Call<Tuples.Zip<Array, [...Call<Tuples.Drop<1, Array>>, undefined]>>;

type ImplProcessString<
  State extends StateType,
  InputString extends string,
> = Pipe<Nextify<Chars<InputString>>, [Tuples.Reduce<ProcessChar, State>]>;
type CommentCheck<State extends StateType> =
  Call<
    Booleans.And,
    Call<Booleans.Equals<State['mode'], Mode.TAGNAME>>,
    Call<Booleans.Equals<State['buffer'], '!--'>>
  > extends true
    ? ValidState<{
        mode: Mode.COMMENT;
        buffer: State['buffer'];
        quote: State['quote'];
        i: State['i'];
        holes: State['holes'];
        nesting: State['nesting'];
      }>
    : State;
interface ProcessString extends Fn {
  return: this['arg0'] extends StateString
    ? [ImplProcessString<this['arg0'][0], this['arg0'][1]>, this['arg0'][1]]
    : never;
}

type ImplIfI<State extends StateType> = State['i'] extends 0
  ? State
  : State['mode'] extends Mode.TAGNAME
    ? ValidState<{
        mode: Mode.WHITESPACE;
        buffer: State['buffer'];
        quote: State['quote'];
        i: State['i'];
        holes: [...State['holes'], State['mode']];
        nesting: State['nesting'];
      }>
    : State['mode'] extends Mode.PROP_SET
      ? ValidState<{
          mode: Mode.PROP_APPEND;
          buffer: State['buffer'];
          quote: State['quote'];
          i: State['i'];
          holes: [...State['holes'], State['mode']];
          nesting: State['nesting'];
        }>
      : ValidState<{
          mode: State['mode'];
          buffer: State['buffer'];
          quote: State['quote'];
          i: State['i'];
          holes: [...State['holes'], State['mode']];
          nesting: State['nesting'];
        }>;
interface IfI extends Fn {
  return: this['arg0'] extends StateString
    ? [ImplIfI<this['arg0'][0]>, this['arg0'][1]]
    : never;
}

interface ToStateString extends Fn {
  return: this['arg0'] extends StateType
    ? [this['arg0'], this['arg1']]
    : this['arg0'] extends StateString
      ? [this['arg0'][0], this['arg1']]
      : never;
}

type HoleTypes<State extends StateType, Types extends TypeMap> = Call<
  Tuples.Map,
  Match<
    [
      Match.With<Mode.COMMENT, unknown>,
      Match.With<Mode.TEXT, Types['child']>,
      Match.With<Mode.TAGNAME, Types['component']>,
      Match.With<Mode.PROP_SET, Types['propValue']>,
      Match.With<Mode.PROP_APPEND, Types['propValue']>,
    ]
  >,
  State['holes']
>;
type TypeMap = {
  child: unknown;
  component: unknown;
  propValue: unknown;
};
type EnsureArray<T> = T extends
  | readonly []
  | readonly [any, ...any]
  | readonly [...any, any]
  ? T
  : [T];
type Postprocess<State extends StateType, Types extends TypeMap> = EnsureArray<
  State['nesting'] extends 0
    ? HoleTypes<State, Types>
    : {
        ParseError: State['mode'] extends Mode.COMMENT
          ? 'Unclosed comment'
          : State['nesting'] extends 1
            ? 'Unclosed tag'
            : `${State['nesting']} unclosed tags`;
      }
>;
type ImplParse<Statics extends readonly string[]> = Pipe<
  Statics,
  [
    Tuples.Reduce<
      ComposeLeft<[ToStateString, IfI, ProcessString, IncrementI]>,
      ValidState<{
        mode: Mode.TEXT;
        buffer: '';
        quote: '';
        i: 0;
        holes: [];
        nesting: 0;
      }>
    >,
    Tuples.At<0>,
  ]
>;
export type Parse<
  Statics extends readonly string[],
  Types extends TypeMap,
> = Postprocess<ImplParse<Statics>, Types>;

function html<Strings extends readonly string[]>(
  _strings: Strings,
  ..._holes: Parse<
    Strings,
    {
      child: 'child';
      component: 'component';
      propValue: 'propValue';
    }
  >
) {
  // Tests are type level
}

// Expect success:

// Empty
html([''] as const);
// No holes
html(['awawa'] as const);
// Self closing tag
html(['<tag/>'] as const);
// Tag
html(['<tag></tag>'] as const);
// Get hole types
html(
  ['<', ' prop=', '>', '</><!--', '-->'] as const,
  'component',
  'propValue',
  'child',
  'commented out (anything goes)',
);

// Expect error:

// @ts-expect-error: invalid holes
html(['<tag ', '="value"></>'] as const, 'nope');
// @ts-expect-error: unexpected holes
html(['awawa'] as const, 1);
// @ts-expect-error: unclosed tag
html(['<tag>'] as const);
