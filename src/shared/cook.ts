/* To regenerate regex:
const regex = (statics: TemplateStringsArray, ...holes: unknown[]) =>
  new RegExp(
    String.raw(
      {
        raw: statics.raw.map((e) => e.replace(/\s+/g, "")),
      },
      ...holes.map((e) =>
        e instanceof RegExp
          ? e.source
          : String(e).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ),
    ),
    "ug",
  );
const join = (...regexes: RegExp[]) =>
  new RegExp(
    "[" + regexes.map((e) => e.source.slice(1, -1)).join("") + "]",
    "u",
  );
const SingleEscapeCharacter = regex`['"\\bfnrtv]`;
const LineTerminator = regex`[\n\r\u2028\u2029]`;
const DecimalDigit = regex`[0-9]`;
const NonZeroDigit = regex`[1-9]`;
const HexDigit = regex`[0-9 a-f A-F]`;
const EscapeCharacter = join(SingleEscapeCharacter, DecimalDigit, /[xu]/);
const SourceCharacter = regex`.`;
const NonEscapeCharacter = join(/[^]/, LineTerminator, EscapeCharacter);
const CharacterEscapeSequence = regex`(?:
  ${SingleEscapeCharacter} |
  ${NonEscapeCharacter}
)`;
const HexEscapeSequence = regex`x ${HexDigit}{2}`;
const Hex4Digits = regex`${HexDigit}{4}`;
const HexDigits = regex`${HexDigit}+`;
const UnicodeEscapeSequence = regex`(?:
  u ${Hex4Digits} |
  u \{ ${HexDigits} \}
)`;
const TemplateEscapeSequence = regex`(?:
  ${CharacterEscapeSequence} |
  0 (?! ${DecimalDigit}) |
  ${HexEscapeSequence} |
  ${UnicodeEscapeSequence}
)`;
const NotEscapeSequence = regex`(?:
  0 ${DecimalDigit} |
  ${NonZeroDigit} |
  x (?! ${HexDigit}) |
  x ${HexDigit} (?! ${HexDigit}) |
  u (?! ${HexDigit} | \{) |
  u ${HexDigit} (?! ${HexDigit}) |
  u ${HexDigit}{2} (?! ${HexDigit}) |
  u ${HexDigit}{3} (?! ${HexDigit}) |
  u \{ (?! ${HexDigits} \})
)`;
const LineTerminatorSequence = regex`(?:
  \r \n |
  \r (?! \n) |
  [\n \u2028 \u2029]
)`;
const LineContinuation = regex`\\ ${LineTerminatorSequence}`;
const templateCharacter = regex`(?:
  \$(?! \{) |
( \\${TemplateEscapeSequence} ) |
( \\${NotEscapeSequence} ) |
( ${LineContinuation} ) |
( ${LineTerminatorSequence} ) |
  ${join(/[^`\\\$]/, LineTerminator)}
)`;
*/
const templateCharacter =
  /(?:\$(?!\{)|(\\(?:(?:['"\\bfnrtv]|[^\n\r\u2028\u2029'"\\bfnrtv0-9xu])|0(?![0-9])|x[0-9a-fA-F]{2}|(?:u[0-9a-fA-F]{4}|u\{[0-9a-fA-F]+\})))|(\\(?:0[0-9]|[1-9]|x(?![0-9a-fA-F])|x[0-9a-fA-F](?![0-9a-fA-F])|u(?![0-9a-fA-F]|\{)|u[0-9a-fA-F](?![0-9a-fA-F])|u[0-9a-fA-F]{2}(?![0-9a-fA-F])|u[0-9a-fA-F]{3}(?![0-9a-fA-F])|u\{(?![0-9a-fA-F]+\})))|(\\(?:\r\n|\r(?!\n)|[\n\u2028\u2029]))|((?:\r\n|\r(?!\n)|[\n\u2028\u2029]))|[^`\\$\n\r\u2028\u2029])/gu;
export function cook<T extends boolean>(
  str: string,
  buildMappings: T,
  allowMalformed: boolean,
): {
  cooked: string;
  mappings: typeof buildMappings extends true ? number[] : undefined;
} {
  let cooked = '';
  let mappings: number[] | undefined;
  let last = 0;

  if (buildMappings) {
    mappings = [];
  }

  for (const match of str.matchAll(templateCharacter)) {
    const [{length}, escape, malformed, lcont, lterm] = match;
    const end = match.index + length;
    if ((escape ?? malformed ?? lcont ?? lterm) != null) {
      if (buildMappings) {
        for (let i = 0; i < match.index - last; i++) {
          mappings![(cooked.length + i) * 2] = last + i;
          mappings![(cooked.length + i) * 2 + 1] = last + i + 1;
        }
      }

      cooked += str.slice(last, match.index);
      last = end;
      if (escape != null) {
        const parsed: string =
          escape.length === 2
            ? ({
                b: '\b',
                f: '\f',
                n: '\n',
                r: '\r',
                t: '\t',
                v: '\v',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                0: '\0',
              }[escape[1]!] ?? escape[1]!)
            : escape[2] === '{'
              ? String.fromCodePoint(Number.parseInt(escape.slice(3, -1), 16))
              : // eslint-disable-next-line unicorn/prefer-code-point
                String.fromCharCode(Number.parseInt(escape.slice(2), 16));
        if (buildMappings) {
          for (let i = 0; i < parsed.length; i++) {
            mappings![(parsed.length + i) * 2] = match.index;
            mappings![(parsed.length + i) * 2 + 1] = end;
          }
        }

        cooked += parsed;
      } else if (lterm != null) {
        if (buildMappings) {
          mappings![cooked.length * 2] = match.index;
          mappings![cooked.length * 2 + 1] = end;
        }

        cooked += '\n';
      } else if (malformed != null) {
        if (allowMalformed) {
          if (buildMappings) {
            mappings![cooked.length * 2] = match.index;
            mappings![cooked.length * 2 + 1] = end;
          }

          cooked += '\uFFFD';
        } else {
          throw new Error('malformed escape sequence');
        }
      } else if (lcont != null) {
        // Remove
      }
    }
  }

  if (buildMappings) {
    for (let i = 0; i < str.length - last; i++) {
      mappings![(cooked.length + i) * 2] = last + i;
      mappings![(cooked.length + i) * 2 + 1] = last + i + 1;
    }
  }

  cooked += str.slice(last);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return {cooked, mappings: mappings as any};
}
