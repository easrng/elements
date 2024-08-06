enum Mode {
  SLASH = 0,
  TEXT = 1,
  WHITESPACE = 2,
  TAGNAME = 3,
  COMMENT = 4,
  PROP_SET = 5,
  PROP_APPEND = 6,
}
export interface TreeNode {
  type: string | number;
  props: [string, (string | number | true)[]][];
  children: (string | number | TreeNode)[];
  parent?: TreeNode;
  close?: number;
}
export const parse = function (statics: readonly string[]) {
  let mode = Mode.TEXT;
  let buffer = '';
  let quote = '';
  let char: string;
  let propName: string;
  // X: let tagOpen: boolean;
  let closingTag: boolean;
  let parent: TreeNode = {
    type: '#fragment',
    props: [],
    children: [],
  };
  const errors: string[] = [];
  const addToProp = (name: string, val: string | number | true) => {
    const last = parent.props.at(-1);
    if (last && last[0] === name) {
      last[1].push(val);
    } else {
      parent.props.push([name, [val]]);
    }
  };

  const commit = (field?: number) => {
    let handledHole = false;
    if (
      mode == Mode.TEXT &&
      (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '')))
    ) {
      parent.children.push(field ?? buffer);
      handledHole = true;
    } else if (mode == Mode.TAGNAME && (field || buffer)) {
      if (field && buffer) {
        errors.push(`Pass either a tag name or a \${component}, not both.`);
      }

      parent.type = field ?? buffer;
      // X: tagOpen = true;
      handledHole = true;
      mode = Mode.WHITESPACE;
    } else if (mode == Mode.WHITESPACE && buffer == '...' && field) {
      addToProp('...', field);
      handledHole = true;
    } else if (mode == Mode.WHITESPACE && buffer && !field) {
      addToProp(buffer, true);
    } else if (mode >= Mode.PROP_SET) {
      if (buffer || (!field && mode == Mode.PROP_SET)) {
        addToProp(propName, buffer);
      }

      if (field) {
        addToProp(propName, field);
        handledHole = true;
      }

      mode = Mode.PROP_APPEND;
    } else if (field && mode == Mode.COMMENT) {
      parent.children.push(field ?? buffer);
      handledHole = true;
    }

    if (closingTag || mode == Mode.SLASH) {
      // eslint-disable-next-line unicorn/no-lonely-if
      if (field) {
        parent.close = field;
        handledHole = true;
      }

      // X: tagOpen = false;
    }

    if (field && !handledHole) {
      errors.push('Incorrect hole placement in mode ' + Mode[mode]);
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
          // [current, '', []];
          const prev = parent;
          parent = {
            type: '',
            props: [],
            children: [],
            parent: prev,
          };
          prev.children.push(parent);
          mode = Mode.TAGNAME;
        } else {
          buffer += char;
        }
      } else if (mode == Mode.COMMENT) {
        /* Ignore everything until the last three characters are '-', '-' and '>' */
        if (buffer == '--' && char == '>') {
          parent = parent.parent!;
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
        if (mode == Mode.TAGNAME) {
          parent = parent.parent!;
        }

        if (parent.parent) {
          parent = parent.parent;
        } else {
          errors.push('Extra closing tag');
        }

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
        parent.type = '#comment';
      }
    }
  }

  commit();
  return {node: parent, errors};
};
