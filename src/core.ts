import {computed, effect, Signal} from '@preact/signals-core';

export * from '@preact/signals-core';
/* This is a horrible hack but it makes the .d.ts valid */
/* eslint-disable-next-line @typescript-eslint/naming-convention */
type hooks = never;
/** @internal */
export type ContextObject = Record<symbol, unknown> & {
  [holeOrListenersOrFragmentInfoOrSuspense]?: SuspenseInfo;
};
export type ComponentProps<
  ExtraProps extends Record<string, unknown> = Record<string, unknown>,
> = ExtraProps & {
  html: typeof html;
  children: Node;
  context: <T>(context: Context<T>) => T | void;
  /** When streaming, an AbortSignal is passed so you can cancel work if the client disconnects */
  signal?: AbortSignal;
};
/** @internal */
export type SyncChild = Node | string;
/** @internal */
export type PossiblyAsyncChild = SyncChild | PromiseLike<SyncChild>;
export type Component<
  ExtraProps extends Record<string, unknown> = Record<string, unknown>,
> = (props: ComponentProps<ExtraProps>) => PossiblyAsyncChild;
const fragOpen = '🧩[';
const fragClose = ']🧩';
function fragmentize(fragment: DocumentFragment): Node {
  if (fragment.childNodes.length > 1) {
    const open = document.createComment(fragOpen);
    const close = document.createComment(fragClose);
    open[holeOrListenersOrFragmentInfoOrSuspense] = fragment;
    fragment.prepend(open);
    fragment.append(close);
    return fragment;
  }

  return fragment.firstChild || document.createComment('');
}

/**
 * Hooks for debug
 * @internal
 */
/* eslint-disable-next-line @typescript-eslint/no-redeclare */
const hooks: {
  /** After parse callback */
  e: (state: CurrentState, mode: Mode) => Children;
  /** Close detector */
  t?: any;
  /** HTML template processor */
  n: (
    fragment: DocumentFragment,
    updates: Update[],
    holes: unknown[],
    context: ContextObject,
  ) => Node;
  /** Context getter */
  o: (key: Context<unknown>) => symbol | undefined;
  /** HTML template string fn */
  s: typeof html;
} = {
  e: (state) => state.slice(1) as Children,
  n: (fragment, toUpdate, holes, context) => {
    applyUpdates(fragment, toUpdate, holes, context);
    return fragmentize(fragment);
  },
  o(key) {
    return contexts.get(key)!;
  },
  s: html,
};

/* Reused */
/**
 * In the parser it represents ${holes},
 * on elements it's the event handler map,
 * on comments it points to the end of the fragment
 * in contexts it is the suspense data key
 */
const holeOrListenersOrFragmentInfoOrSuspense = Symbol();

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
type StringOrHole = string | typeof holeOrListenersOrFragmentInfoOrSuspense;
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
  let current: CurrentState = [hooks.t];
  let char: string;
  let propName: string;

  const commit = (field?: number) => {
    if (
      mode == Mode.TEXT &&
      (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '')))
    ) {
      current.push(field ? holeOrListenersOrFragmentInfoOrSuspense : buffer);
    } else if (!current[0]) {
      /* Top level */
    } else if (mode == Mode.TAGNAME && (field || buffer)) {
      current[1] = field ? holeOrListenersOrFragmentInfoOrSuspense : buffer;
      mode = Mode.WHITESPACE;
    } else if (mode == Mode.WHITESPACE && buffer == '...' && field) {
      current[2].push(['...', holeOrListenersOrFragmentInfoOrSuspense]);
    } else if (mode == Mode.WHITESPACE && buffer && !field) {
      current[2].push([buffer, true]);
    } else if (mode >= Mode.PROP_SET) {
      if (mode == Mode.PROP_SET) {
        current[2].push(
          field
            ? buffer
              ? [propName, buffer, holeOrListenersOrFragmentInfoOrSuspense]
              : [propName, holeOrListenersOrFragmentInfoOrSuspense]
            : [propName, buffer],
        );
        mode = Mode.PROP_APPEND;
      } else if (field || buffer) {
        current[2][current[2].length - 1]!.push(
          ...(field
            ? ([buffer, holeOrListenersOrFragmentInfoOrSuspense] as const)
            : [buffer]),
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

        (mode as unknown as CurrentState) = current;
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
  return hooks.e(current, mode);
};

/* Framework */
export type Context<T> = Component & {
  __brand: 'Context';
  __type: T;
};
const contexts = new WeakMap<Component, symbol>();
const createContext = <T>(): Context<T> => {
  const fn: Component = ({children}) => children;
  contexts.set(fn, Symbol());
  return fn as Context<T>;
};

type SuspenseInfo = PromiseLike<unknown>[];
// eslint-disable-next-line @typescript-eslint/naming-convention
const Suspense: Component<{
  fallback: SyncChild;
  children: PossiblyAsyncChild;
}> = ({children}) => {
  return children;
};

type Location = number[];
const isNonDimensional =
  /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
type Handler = (event: Event) => unknown;
/**
 * @internal
 */
declare global {
  interface Element {
    [holeOrListenersOrFragmentInfoOrSuspense]: Record<string, Handler>;
  }
  interface Comment {
    [holeOrListenersOrFragmentInfoOrSuspense]: DocumentFragment;
  }
}
const setStyle = (style: CSSStyleDeclaration, key: string, value: unknown) => {
  if (key[0] == '-') {
    style.setProperty(key, value == null ? '' : String(value));
  } else if (value == null) {
    (style as any)[key] = '';
  } else if (typeof value != 'number' || isNonDimensional.test(key)) {
    (style as any)[key] = value;
  } else {
    (style as any)[key] = value + 'px';
  }
};

function eventProxyCapture(this: Element, event: Event) {
  return this[holeOrListenersOrFragmentInfoOrSuspense][event.type + true]!(
    event,
  );
}

function eventProxy(this: Element, event: Event) {
  return this[holeOrListenersOrFragmentInfoOrSuspense][event.type + false]!(
    event,
  );
}

const setProperty = (
  dom: Element,
  name: string,
  oldValue: any,
  value: any,
  hydrate?: () => void,
) => {
  let useCapture: boolean | string;
  if (value instanceof Signal) {
    if (hydrate) {
      return hydrate();
    }

    if (name == 'ref') {
      value.value = dom;
      return;
    }

    effectCleanup.register(
      dom,
      effect(() => {
        setProperty(dom, name, oldValue, (oldValue = value.value as unknown));
      }),
    );
  } else if (name == '...') {
    if (hydrate) {
      return hydrate();
    }

    /* eslint-disable-next-line guard-for-in */
    for (const spreadName in value) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const oldSpreadValue = oldValue
        ? spreadName in oldValue
          ? oldValue[spreadName]
          : null
        : null;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const spreadValue = value[spreadName];
      setProperty(dom, spreadName, oldSpreadValue, spreadValue);
    }
  } else if (name == 'style') {
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

    if (!dom[holeOrListenersOrFragmentInfoOrSuspense]) {
      dom[holeOrListenersOrFragmentInfoOrSuspense] = {};
    }

    dom[holeOrListenersOrFragmentInfoOrSuspense][name + useCapture] =
      value as Handler;

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
        (dom as any)[name] = value == null ? '' : value;
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
    } else if (value != null && (value !== false || name[4] == '-')) {
      dom.setAttribute(name, value as string);
    } else {
      dom.removeAttribute(name);
    }
  }
};

type UpdateProp = (string | true | [1, number] | [0, unknown])[];
type Update = {
  /** Location of the node in the DOM fragment */
  e: Location;
} & (
  | {
      /** Hole to replace node with */
      t: number;
      n?: undefined;
      o?: undefined;
      s?: undefined;
      r?: undefined;
      l?: undefined;
    }
  | {
      t?: undefined;
      /** Property to set on node after clone. Format is [name, ...valueParts[]] */
      n: UpdateProp;
      o?: undefined;
      s?: undefined;
      r?: undefined;
      l?: undefined;
    }
  | {
      t?: undefined;
      n?: undefined;
      /** Hole to be component */
      o: number;
      /** Component props */
      s: UpdateProp[];
      /** Component children */
      r: DocumentFragment;
      /** ToUpdate */
      l: Update[];
    }
);
type Template = ReturnType<typeof template>;
function template(strings: readonly string[]) {
  const children = parse(strings);
  let lastHole = 0;
  function appendChildren(
    parent: Element | DocumentFragment,
    children: Children,
    l: Location,
    toUpdate: Update[],
  ) {
    for (const child of children) {
      const location = [...l, parent.childNodes.length];
      let node;
      if (child === holeOrListenersOrFragmentInfoOrSuspense) {
        toUpdate.push({
          e: location,
          t: lastHole++,
        });
        node = document.createComment('');
      } else if (typeof child == 'string') {
        if ((node = parent.lastChild) && node.nodeType == 3) {
          node.nodeValue += child;
        } else {
          node = document.createTextNode(child);
        }
      } else {
        /* `child` is Ele */
        const [type, props, ...children] = child;
        if (type === holeOrListenersOrFragmentInfoOrSuspense) {
          const childrenFrag = document.createDocumentFragment();
          const childUpdates: Update[] = [];
          toUpdate.push({
            e: location,
            o: lastHole++,
            r: childrenFrag,
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            s: props.map((prop) =>
              prop.map((propPart) =>
                propPart == holeOrListenersOrFragmentInfoOrSuspense
                  ? [1, lastHole++]
                  : propPart,
              ),
            ),
            l: childUpdates,
          });
          appendChildren(childrenFrag, children as Children, [], childUpdates);
          node = document.createComment('');
        } else {
          node = document.createElement(type);
          for (const prop of props) {
            if (prop.includes(holeOrListenersOrFragmentInfoOrSuspense)) {
              toUpdate.push({
                e: location,
                /* eslint-disable-next-line @typescript-eslint/no-loop-func */
                n: prop.map((propPart) =>
                  propPart == holeOrListenersOrFragmentInfoOrSuspense
                    ? [1, lastHole++]
                    : propPart,
                ),
              });
            } else {
              const name = prop[0];
              const value = prop.length > 2 ? prop.slice(1).join('') : prop[1];
              setProperty(node, name, null, value, (_?: never) =>
                toUpdate.push({
                  e: location,
                  n: [name, [0, value]],
                }),
              );
            }
          }

          appendChildren(node, children as Children, location, toUpdate);
        }
      }

      parent.append(node);
    }
  }

  const frag = document.createDocumentFragment();
  const toUpdate: Update[] = [];
  appendChildren(frag, children, [], toUpdate);
  return {
    e: frag,
    t: toUpdate,
  };
}

function replaceWith(oldNode: ChildNode, newNode: string | Node) {
  if (newNode !== oldNode) {
    if (oldNode.nodeType == 8 && oldNode.nodeValue == fragOpen) {
      const fragment = (oldNode as Comment)[
        holeOrListenersOrFragmentInfoOrSuspense
      ];
      for (let depth = 0; ; ) {
        const next = oldNode.nextSibling;
        depth +=
          oldNode.nodeType == 8
            ? oldNode.nodeValue == fragOpen
              ? 1
              : oldNode.nodeValue == fragClose
                ? -1
                : 0
            : 0;
        if (!next || !depth) break;
        fragment.append(oldNode);
        oldNode = next;
      }
    }

    oldNode.replaceWith(newNode);
  }
}

const effectCleanup = new FinalizationRegistry<() => void>((fn) => fn());

function applyUpdates(
  fragment: DocumentFragment,
  updates: Update[],
  holes: unknown[],
  context: ContextObject,
) {
  const parseUpdateProp = (updateProp: UpdateProp): [string, unknown] => {
    let hasSignal;
    let hole;
    const [name, ...value] = updateProp.map((propPart) => {
      // eslint-disable-next-line no-return-assign
      return Array.isArray(propPart)
        ? propPart[0]
          ? (hole = holes[propPart[1]]) instanceof Signal
            ? ((hasSignal = true), hole)
            : hole
          : propPart[1]
        : propPart;
    });
    return [
      name as string,
      hasSignal
        ? value.length > 1
          ? computed(() => value.join(''))
          : (value[0] as Signal)
        : value.length > 1
          ? value.join('')
          : value[0],
    ];
  };

  const holeToNode = (hole: unknown): Node => {
    const frag = document.createDocumentFragment();
    const children = (
      Array.isArray(hole) ? hole.flat(Number.POSITIVE_INFINITY) : [hole]
    ) as unknown[];
    for (let item of children) {
      if (item == null || /boolean|function|symbol/.test(typeof item)) continue;
      const signal = item;
      if (signal instanceof Signal) {
        const anchor = document.createComment('⚓');
        (item = document.createDocumentFragment()).append(
          anchor,
          document.createComment(''),
        );
        effectCleanup.register(
          anchor,
          effect(() => {
            replaceWith(anchor.nextSibling!, holeToNode(signal.value));
          }),
        );
      }

      const result =
        item instanceof Node ? item : document.createTextNode(item as string);
      if (children.length == 1) return result;
      frag.append(result);
    }

    return fragmentize(frag);
  };

  for (const update of updates) {
    /* eslint-disable-next-line unicorn/no-array-reduce */
    const node = update.e.reduce<DocumentFragment | ChildNode>(
      (node, i) => node.childNodes[i]!,
      fragment,
    ) as ChildNode;

    /* If update.t is undefined this is NaN which is falsy, if it's 0 it's still true, which saves space :D */
    if (update.t! + 1) {
      const hole = holes[update.t!]!;
      replaceWith(node, holeToNode(hole));
    } else if (update.n) {
      const [name, value] = parseUpdateProp(update.n);
      setProperty(node as Element, name, null, value);
    } else {
      // Component
      const children = update.r!.cloneNode(true) as DocumentFragment;
      const props: ComponentProps = {
        children,
        html: html.bind(context),
        // eslint-disable-next-line @typescript-eslint/no-loop-func, @typescript-eslint/no-unsafe-return
        context: (key) => context[hooks.o(key)!] as any,
      };
      for (const item of update.s!) {
        const [name, value] = parseUpdateProp(item);
        Object.assign(props, name == '...' ? value : {[name]: value});
      }

      let contextSymbol;
      if ((contextSymbol = hooks.o(holes[update.o!] as Context<unknown>))) {
        context = Object.create(context) as ContextObject;
        context[contextSymbol] = props['value'];
      }

      const fn = holes[update.o!] as Component;
      if (fn == Suspense) {
        const promises: SuspenseInfo = [];
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        context[holeOrListenersOrFragmentInfoOrSuspense] = promises;
        queueMicrotask(() => {
          if (promises.length > 0) {
            const previous = node.previousSibling;
            const parent = node.parentNode!;
            replaceWith(
              node,
              (props as unknown as Parameters<typeof Suspense>[0]).fallback,
            );
            const fallback = previous
              ? previous.nextSibling!
              : parent.firstChild!;
            Promise.all(promises).then(() => {
              replaceWith(fallback, children);
            }, console.error);
          } else {
            replaceWith(node, children);
          }
        });
      }

      applyUpdates(children, update.l!, holes, context);
      props.children = fragmentize(props.children as DocumentFragment);
      if (fn == Suspense) {
        props.children = node as unknown as DocumentFragment;
      }

      const possiblyAsyncNode = fn(props);
      if (
        typeof possiblyAsyncNode == 'object' &&
        possiblyAsyncNode &&
        'then' in possiblyAsyncNode
      ) {
        const promise = Promise.resolve(possiblyAsyncNode).then((value) => {
          replaceWith(node, holeToNode(value));
        });
        context[holeOrListenersOrFragmentInfoOrSuspense]?.push(promise);
      } else {
        replaceWith(node, holeToNode(possiblyAsyncNode));
      }
    }
  }
}

const cache = new WeakMap<readonly string[], Template>();
function html(strings: readonly string[], ...holes: unknown[]) {
  let tmpl = cache.get(strings);
  if (!tmpl) {
    cache.set(strings, (tmpl = template(strings)));
  }

  return hooks.n(
    tmpl.e.cloneNode(true) as DocumentFragment,
    tmpl.t,
    holes,
    // @ts-expect-error this is an implementation detail
    this as ContextObject,
  );
}

function render(component: Component<Record<never, never>>) {
  return html.bind({})`<${component}/>`;
}

export {createContext, hooks as _h, render, Suspense};
