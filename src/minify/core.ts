enum Mode {
  SLASH = 0,
  TEXT = 1,
  WHITESPACE = 2,
  TAGNAME = 3,
  COMMENT = 4,
  PROP_SET = 5,
  PROP_APPEND = 6,
}
const hole = Symbol();

const special = /['">=/ \t\n\r]/;
function quote(str: string, single: boolean) {
  const char = single ? "'" : '"';
  const other = single ? '"' : "'";
  return (
    char +
    str.replaceAll(char, char + other + char + other + char) +
    char
  ).replaceAll(char + char, '');
}

function escapePropValue(
  input: (typeof hole | string)[],
): (typeof hole | string)[] {
  const parts: (typeof hole | string)[] = [];
  for (const v of input) {
    if (typeof v === 'string' && typeof parts[parts.length - 1] === 'string') {
      (parts[parts.length - 1] as string) += v;
    } else {
      parts.push(v);
    }
  }

  for (let i = 0; i < parts.length; i++) {
    const value = parts[i]!;
    if (value === hole) continue;
    const prev = parts[i - 1];
    const preprev = parts[i - 1];
    let single;
    if (
      prev === hole &&
      typeof preprev === 'string' &&
      ((single = preprev.at(-1) === "'") || preprev.at(-1) === '"')
    ) {
      parts[i - 1] = preprev.slice(0, -1);
      parts[i] = quote(value, single).slice(1);
    } else if (special.test(value)) {
      const singleQuoted = quote(value, true);
      const doubleQuoted = quote(value, false);
      parts[i] =
        singleQuoted.length < doubleQuoted.length ? singleQuoted : doubleQuoted;
    }
  }

  return parts;
}

export function minifyStatics(statics: readonly string[]): readonly string[] {
  let mode = Mode.TEXT;
  let buffer = '';
  let quote = '';
  const minified: (string | typeof hole | [string, [string | typeof hole]])[] =
    [''];
  let char;
  let propName: string;
  let tagOpen: boolean;
  let closingTag: boolean;

  const commit = (field?: number) => {
    let handledHole = false;
    if (
      mode == Mode.TEXT &&
      (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '')))
    ) {
      minified.push('', field ? hole : buffer);
      handledHole = true;
    } else if (mode == Mode.TAGNAME) {
      minified.push('<');
      tagOpen = true;
      minified.push(field ? hole : buffer);
      handledHole = true;
      mode = Mode.WHITESPACE;
    } else if (mode == Mode.WHITESPACE && buffer == '...' && field) {
      minified.push(' ...', hole);
      handledHole = true;
    } else if (mode == Mode.WHITESPACE && buffer && !field) {
      minified.push(' ' + buffer);
    } else if (mode >= Mode.PROP_SET) {
      if (buffer || (!field && mode == Mode.PROP_SET)) {
        minified.push([propName, [buffer]]);
        mode = Mode.PROP_APPEND;
      }

      if (field) {
        minified.push([propName, [hole]]);
        handledHole = true;
        mode = Mode.PROP_APPEND;
      }
    } else if (mode == Mode.SLASH) {
      minified.push((tagOpen ? '' : '<') + '/');
    } else if (field && mode == Mode.COMMENT) {
      minified.push('', field ? hole : buffer);
      handledHole = true;
    }

    if (closingTag || mode == Mode.SLASH) {
      if (field) {
        minified.push(hole);
        handledHole = true;
      }

      minified.push('>');
      tagOpen = false;
    }

    if (field && !handledHole) {
      throw new TypeError('Incorrect hole placement, mode: ' + Mode[mode]);
    }

    buffer = '';
    closingTag = false;
  };

  for (let i = 0; i < statics.length; i++) {
    if (i) {
      if (mode == Mode.TEXT) {
        commit();
      }

      commit(i);
    }

    for (let j = 0; j < statics[i]!.length; j++) {
      char = statics[i]![j]!;

      if (mode == Mode.TEXT) {
        if (char == '<') {
          /* Commit buffer */
          commit();
          mode = Mode.TAGNAME;
        } else {
          buffer += char;
        }
      } else if (mode == Mode.COMMENT) {
        /* Ignore everything until the last three characters are '-', '-' and '>' */
        if (buffer == '--' && char == '>') {
          minified.push('-->');
          mode = Mode.TEXT;
          buffer = '';
        } else {
          buffer = char + buffer[0];
        }
      } else if (quote) {
        if (char == quote) {
          quote = '';
        } else {
          buffer += char;
        }
      } else if (char == '"' || char == "'") {
        quote = char;
      } else if (char == '>') {
        closingTag = true;
        commit();
        mode = Mode.TEXT;
      } else if (!mode) {
        /* Ignore everything until the tag ends */
      } else if (char == '=') {
        mode = Mode.PROP_SET;
        quote = '';
        propName = buffer;
        buffer = '';
      } else if (
        char == '/' &&
        (mode < Mode.PROP_SET || statics[i]![j + 1] == '>')
      ) {
        commit();
        mode = Mode.SLASH;
      } else if (/[ \t\n\r]/.test(char)) {
        /* <a disabled> */
        commit();
        mode = Mode.WHITESPACE;
      } else {
        buffer += char;
      }

      if (mode == Mode.TAGNAME && buffer == '!--') {
        mode = Mode.COMMENT;
        minified.push('<!--');
      }
    }
  }

  commit();
  minified.push('');
  const newStatics = minified
    // eslint-disable-next-line unicorn/no-array-reduce
    .reduce<typeof minified>((acc, curr) => {
      const last = acc[acc.length - 1];
      if (Array.isArray(last) && Array.isArray(curr) && last[0] === curr[0]) {
        last[1].push('', curr[1][0]);
      } else {
        acc.push(curr);
      }

      return acc;
    }, [])
    .flatMap((item) =>
      Array.isArray(item)
        ? [' ', item[0], '=', ...escapePropValue(item[1])]
        : item,
    )
    // eslint-disable-next-line unicorn/no-array-reduce
    .reduce<(string | typeof hole)[]>((accumulator, current) => {
      const last = accumulator[accumulator.length - 1];
      if (typeof last == 'string' && typeof current == 'string') {
        if (current == '-->' && last.endsWith('<!--')) {
          accumulator[accumulator.length - 1] = last.slice(0, -4);
        } else {
          accumulator[accumulator.length - 1] = last + current;
        }
      } else {
        accumulator.push(current);
      }

      return accumulator;
    }, [])
    .filter((item): item is string => typeof item == 'string');

  return newStatics;
}
