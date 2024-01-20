/* Frequently used globals */
/* Check with terser + gzip to see if adding things here is actually worth it */
const _null_ = null;
const _document_ = document;

/* This is a horrible hack but it makes the .d.ts valid */
/* eslint-disable-next-line @typescript-eslint/naming-convention */
type hooks = never;

/**
 * Hooks for debug
 * @internal
 */
/* eslint-disable-next-line @typescript-eslint/no-redeclare */
const hooks: {
  /** After parse callback, checks for unclosed tags */
  p: (state: CurrentState) => Children;
  /** Before close callback, checks for extra closing tags */
  c?: (state: CurrentState) => unknown;
} = {
  p: (state) => state.slice(1) as Children,
};

/* Reused */
/**
 * In the parser it represents ${holes},
 * on elements it's the event handler map,
 * on comments it points to the end of the fragment
 */
const holeOrListenersOrFragEnd = Symbol();

/* HTM parser */
const enum Mode {
  SLASH = 0,
  TEXT = 1,
  WHITESPACE = 2,
  TAGNAME = 3,
  COMMENT = 4,
  PROP_SET = 5,
  PROP_APPEND = 6,
}
type StringOrHole = string | typeof holeOrListenersOrFragEnd;
type Props = [string, ...(StringOrHole | true)[]][];
type Ele = [StringOrHole, Props, ...unknown[]];
/**
 * @internal
 */
export type Children = (StringOrHole | Ele)[];
type CurrentStateChild = [unknown, StringOrHole, Props, ...Children] & {
  [0]: CurrentState;
};
type CurrentStateParent = [undefined, ...Children];
type CurrentState = CurrentStateParent | CurrentStateChild;
const parse = function (statics: readonly string[]): Children {
  let mode = Mode.TEXT;
  let buffer = '';
  let quote = '';
  let current: CurrentState = [,];
  let char: string;
  let propName: string;

  const commit = (field?: number) => {
    if (
      mode == Mode.TEXT &&
      (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '')))
    ) {
      current.push(field ? holeOrListenersOrFragEnd : buffer);
    } else if (!current[0]) {
      /* Top level */
    } else if (mode == Mode.TAGNAME && (field || buffer)) {
      current[1] = field ? holeOrListenersOrFragEnd : buffer;
      mode = Mode.WHITESPACE;
    } else if (mode == Mode.WHITESPACE && buffer && !field) {
      current[2].push([buffer, true]);
    } else if (mode >= Mode.PROP_SET) {
      if (mode == Mode.PROP_SET) {
        current[2].push(
          field
            ? buffer
              ? [propName, buffer, holeOrListenersOrFragEnd]
              : [propName, holeOrListenersOrFragEnd]
            : [propName, buffer],
        );
        mode = Mode.PROP_APPEND;
      } else if (field || buffer) {
        current[2][current[2].length - 1]!.push(
          ...(field ? ([buffer, holeOrListenersOrFragEnd] as const) : [buffer]),
        );
      }
    }

    buffer = '';
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
          current = [current, '', []];
          mode = Mode.TAGNAME;
        } else {
          buffer += char;
        }
      } else if (mode == Mode.COMMENT) {
        /* Ignore everything until the last three characters are '-', '-' and '>' */
        if (buffer == '--' && char == '>') {
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
        commit();
        mode = Mode.TEXT;
      } else if (!mode) {
        /* Ignore everything until the tag ends */
      } else if (char == '=') {
        mode = Mode.PROP_SET;
        propName = buffer;
        buffer = '';
      } else if (
        char == '/' &&
        (mode < Mode.PROP_SET || statics[i]![j + 1] == '>')
      ) {
        commit();
        if (mode == Mode.TAGNAME) {
          current = current[0]!;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions, @typescript-eslint/prefer-optional-chain
        hooks.c && hooks.c(((mode as unknown as CurrentState) = current));
        (current = current[0]!).push(
          (mode as unknown as unknown[]).slice(1) as Ele,
        );
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
        current = current[0]!;
      }
    }
  }

  commit();
  return hooks.p(current);
};

/* Framework */
type Location = number[];
const isNonDimensional =
  /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
type Handler = (event: Event) => unknown;
/**
 * @internal
 */
declare global {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
  interface Element {
    [holeOrListenersOrFragEnd]: Record<string, Handler>;
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
  interface Comment {
    [holeOrListenersOrFragEnd]: Comment;
  }
}
const setStyle = (style: CSSStyleDeclaration, key: string, value: unknown) => {
  if (key[0] == '-') {
    style.setProperty(key, value == _null_ ? '' : String(value));
  } else if (value == _null_) {
    (style as any)[key] = '';
  } else if (typeof value != 'number' || isNonDimensional.test(key)) {
    (style as any)[key] = value;
  } else {
    (style as any)[key] = value + 'px';
  }
};

function eventProxyCapture(this: Element, event: Event) {
  return this[holeOrListenersOrFragEnd][event.type + true]!(event);
}

function eventProxy(this: Element, event: Event) {
  return this[holeOrListenersOrFragEnd][event.type + false]!(event);
}

const setProperty = (
  dom: Element,
  name: string,
  oldValue: any,
  value: any,
  hydrate?: () => void,
) => {
  let useCapture: boolean | string;
  if (name == 'style') {
    if (hydrate) {
      return hydrate();
    }

    if (typeof value == 'string') {
      (dom as Element & ElementCSSInlineStyle).style.cssText = value;
    } else {
      if (typeof oldValue == 'string') {
        /* eslint-disable-next-line no-multi-assign */
        (dom as Element & ElementCSSInlineStyle).style.cssText = oldValue = '';
      }

      if (oldValue) {
        for (name in oldValue) {
          if (!(value && name in value)) {
            setStyle((dom as Element & ElementCSSInlineStyle).style, name, '');
          }
        }
      }

      if (value) {
        for (name in value) {
          if (!oldValue || value[name] !== oldValue[name]) {
            setStyle(
              (dom as Element & ElementCSSInlineStyle).style,
              name,
              value[name],
            );
          }
        }
      }
    }
  } else if (/^on/.test(name)) {
    if (hydrate) {
      return hydrate();
    }

    /* Infer correct casing for DOM built-in events: */
    name = ((useCapture = name.toLowerCase()) in dom ? useCapture : name).slice(
      2,
    );

    useCapture =
      name != (name = name.replace(/(PointerCapture)$|Capture$/, '$1'));

    if (!dom[holeOrListenersOrFragEnd]) {
      dom[holeOrListenersOrFragEnd] = {};
    }

    dom[holeOrListenersOrFragEnd][name + useCapture] = value as Handler;

    const handler = useCapture ? eventProxyCapture : eventProxy;
    if (value) {
      if (!oldValue) {
        dom.addEventListener(name, handler, useCapture);
      }
    } else {
      dom.removeEventListener(name, handler, useCapture);
    }
  } else {
    if (
      /^(width|height|href|list|form|tabIndex|download|rowSpan|colSpan|role)$/.test(
        name,
      ) &&
      name in dom
    ) {
      try {
        if (hydrate) {
          return hydrate();
        }

        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
        (dom as any)[name] = value == _null_ ? '' : value;
        return;
      } catch {
        /* ignore */
      }
    }

    /* Aria- and data- attributes have no boolean representation. */
    /* A `false` value is different from the attribute not being */
    /* present, so we can't remove it. For non-boolean aria */
    /* attributes we could treat false as a removal, but the */
    /* amount of exceptions would cost too many bytes. On top of */
    /* that other frameworks generally stringify `false`. */

    if (/function|symbol/.test(typeof value)) {
      /* Never serialize functions as attribute values */
    } else if (value != _null_ && (value !== false || name[4] == '-')) {
      dom.setAttribute(name, value as string);
    } else {
      dom.removeAttribute(name);
    }
  }
};

type Template = ReturnType<typeof template>;
function template(strings: TemplateStringsArray) {
  const children = parse(strings);
  let lastHole = 0;
  type Update = {
    /** Location of the node in the DOM fragment */
    l: Location;
    /** Property to set on node after clone. Format is [name, ...valueParts[]] */
    p?: (string | true | [1, number] | [0, unknown])[];
    /** Hole to replace node with */
    h?: number;
  };
  const toUpdate: Update[] = [];
  function appendChildren(
    parent: Element | DocumentFragment,
    children: Children,
    l: Location,
  ) {
    for (const child of children) {
      const location = [...l, parent.childNodes.length];
      let node;
      if (child === holeOrListenersOrFragEnd) {
        toUpdate.push({
          l: location,
          h: lastHole++,
        });
        node = _document_.createComment('');
      } else if (typeof child == 'string') {
        if ((node = parent.lastChild) && node.nodeType == 3) {
          node.nodeValue += child;
        } else {
          node = _document_.createTextNode(child);
        }
      } else {
        /* `child` is Ele */
        const [type, props, ...children] = child;
        if (type == holeOrListenersOrFragEnd) {
          throw new Error('components are not implemented');
        }

        node = _document_.createElement(type);
        for (const prop of props) {
          if (prop.includes(holeOrListenersOrFragEnd)) {
            toUpdate.push({
              l: location,
              /* eslint-disable-next-line @typescript-eslint/no-loop-func */
              p: prop.map((propPart) =>
                propPart == holeOrListenersOrFragEnd
                  ? [1, lastHole++]
                  : propPart,
              ),
            });
          } else {
            const name = prop[0];
            const value = prop.length > 2 ? prop.slice(1).join('') : prop[1];
            setProperty(node, name, _null_, value, (_?: never) =>
              toUpdate.push({
                l: location,
                p: [name, [0, value]],
              }),
            );
          }
        }

        appendChildren(node, children as Children, location);
      }

      parent.append(node);
    }
  }

  const frag = _document_.createDocumentFragment();
  appendChildren(frag, children, []);
  return {
    f: frag,
    u: toUpdate,
  };
}

const cache = new WeakMap<TemplateStringsArray, Template>();
function html(strings: TemplateStringsArray, ...holes: (string | Node)[]) {
  let tmpl = cache.get(strings);
  if (!tmpl) {
    cache.set(strings, (tmpl = template(strings)));
  }

  const fragment = tmpl.f.cloneNode(true) as DocumentFragment;
  for (const update of tmpl.u) {
    /* eslint-disable-next-line unicorn/no-array-reduce */
    const node = update.l.reduce<DocumentFragment | ChildNode>(
      (node, i) => node.childNodes[i]!,
      fragment,
    ) as ChildNode;
    /* If update.h is undefined this is NaN which is falsy, if it's 0 it's still true, which saves space :D */
    if (update.h! + 1) {
      const hole = holes[update.h!]!;
      node.replaceWith(hole);
    }

    if (update.p) {
      const [name, ...value] = update.p.map((propPart) =>
        Array.isArray(propPart)
          ? propPart[0]
            ? holes[propPart[1]]
            : propPart[1]
          : propPart,
      );
      setProperty(
        node as Element,
        name as string,
        _null_,
        value.length > 1 ? value.join('') : value[0],
      );
    }
  }

  if (fragment.childNodes.length > 1) {
    const close = document.createComment('');
    const open = document.createComment('');
    open[holeOrListenersOrFragEnd] = close;
    fragment.prepend(open);
    fragment.append(close);
  }

  return fragment;
}

export {hooks as _h, html};
