import MagicString from 'magic-string';
import jsTokens, {type Token} from 'js-tokens';
import type {LoaderContext} from 'webpack';
import {minifyStatics} from './core.js';

const templateStringify = (str: string) =>
  JSON.stringify(str).replace(/\${|`/g, '\\$&').slice(1, -1);

const overwrite = (
  magic: MagicString,
  from: number,
  to: number,
  content: string,
) => {
  if (from === to) {
    magic.appendLeft(from, content);
  } else {
    magic.overwrite(from, to, content);
  }
};

const rollupPlugin = {
  name: '@easrng/elements/minify',
  transform(
    this: unknown | void,
    code: string,
  ): {
    code: string;
    map: {
      file: string;
      mappings: string;
      names: string[];
      sources: string[];
      sourcesContent?: string[];
      version: number;
    };
  } {
    const context = this as void | {
      warn?: (str: string, pos: number) => unknown;
    };
    const warn: (str: string, pos: number) => unknown =
      typeof context?.warn === 'function'
        ? context.warn.bind(context)
        : (str, pos) => {
            console.warn(str, 'at', pos);
          };

    const magic = new MagicString(code);
    let index = 0;
    let lastNonWhitespace: Token | undefined;
    const templateStack: ({str: string; pos: number}[] | false)[] = [];
    for (const token of jsTokens(code)) {
      if (
        lastNonWhitespace?.type === 'IdentifierName' &&
        lastNonWhitespace.value === 'html'
      ) {
        if (token.type === 'NoSubstitutionTemplate') {
          const newValue = templateStringify(
            minifyStatics([eval(token.value) as string])[0]!, // eslint-disable-line no-eval
          );
          overwrite(
            magic,
            index + 1,
            index + 1 + (token.value.length - 2),
            newValue,
          );
        } else if (token.type === 'TemplateHead') {
          templateStack.unshift([
            {
              str: token.value.slice(1, -2),
              pos: index + 1,
            },
          ]);
        }
      } else if (token.type === 'TemplateHead') {
        templateStack.unshift(false);
      }

      if (token.type === 'TemplateMiddle' && templateStack[0]) {
        templateStack[0].push({
          str: token.value.slice(1, -2),
          pos: index + 1,
        });
      }

      if (token.type === 'TemplateTail') {
        const rawStatics = templateStack.shift();
        if (rawStatics) {
          rawStatics.push({
            str: token.value.slice(1, -1),
            pos: index + 1,
          });
          const statics = rawStatics.map(
            ({str}) => eval('`' + str + '`') as string, // eslint-disable-line no-eval
          );
          let minified;
          try {
            minified = minifyStatics(statics).entries();
            for (const [i, newStatic] of minified) {
              const raw = rawStatics[i]!;
              overwrite(
                magic,
                raw.pos,
                raw.pos + raw.str.length,
                templateStringify(newStatic),
              );
            }
          } catch (error) {
            warn(String(error), index);
          }
        }
      }

      if (token.type !== 'WhiteSpace') {
        lastNonWhitespace = token;
      }

      index += token.value.length;
    }

    return {
      code: magic.toString(),
      map: magic.generateMap(),
    };
  },
};

function elementsMinify(
  this: LoaderContext<Record<any, never>>,
  contents: string,
  inputSourceMap?: Record<string, any>,
): void;
function elementsMinify(): typeof rollupPlugin;
function elementsMinify(this: unknown, contents?: unknown): any {
  if (
    this &&
    typeof this === 'object' &&
    'callback' in this &&
    'addBuildDependency' in this
  ) {
    const context = this as LoaderContext<Record<any, never>>;
    const {code, map} = rollupPlugin.transform(contents as string);
    context.callback(null, code, map);
  } else {
    return rollupPlugin;
  }
}

export default elementsMinify;
