import {computed, effect, Signal, untracked} from '@preact/signals-core';

// eslint-disable-next-line @typescript-eslint/naming-convention
declare const TINY: boolean;

export interface DocNode extends EventTarget {
  nodeType: number;
  cloneNode(includeChildren: boolean): DocNode;
}
export interface DocChildNode extends DocNode {
  // eslint-disable-next-line @typescript-eslint/ban-types
  nextSibling: DocChildNode | null;
  // eslint-disable-next-line @typescript-eslint/ban-types
  previousSibling: DocChildNode | null;
  // eslint-disable-next-line @typescript-eslint/ban-types
  parentNode: DocNode | null;
}
export interface DocComment extends DocChildNode {
  // eslint-disable-next-line @typescript-eslint/ban-types
  nodeValue: string | null;
}
export interface DocTextNode extends DocChildNode {
  // eslint-disable-next-line @typescript-eslint/ban-types
  nodeValue: string | null;
}
export interface DocParentNode extends DocNode {
  namespaceURI?: string;
  childNodes: ArrayLike<DocChildNode>;
  prepend(...nodes: (DocNode | string)[]): void;
  append(...nodes: (DocNode | string)[]): void;
  replaceChild(newNode: DocNode, oldNode: DocNode): void;
}
export interface DocElement extends DocParentNode, DocChildNode {
  namespaceURI: string;
  innerHTML: string;
  outerHTML: string;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface DocHTMLElement extends DocElement {
  style: {
    cssText: string;
    setProperty(key: string, value: string): void;
  };
}
export type Doc = {
  createComment: (text: string) => DocComment;
  createTextNode: (text: string) => DocTextNode;
  createDocumentFragment: () => DocParentNode;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  createElementNS(
    namespaceURI:
      | 'http://www.w3.org/1999/xhtml'
      | 'http://www.w3.org/2000/svg'
      | 'http://www.w3.org/1998/Math/MathML'
      | string
      // eslint-disable-next-line @typescript-eslint/ban-types
      | null,
    qualifiedName: string,
    options?: undefined,
  ): DocElement;
};

/* This is a horrible hack but it makes the .d.ts valid */
/* eslint-disable-next-line @typescript-eslint/naming-convention */
type hooks = never;
/** @internal */
export type ContextObject = Record<symbol, unknown> & {
  [holeOrListenersOrFragmentInfoOrSuspense]?: SuspenseInfo;
  // eslint-disable-next-line @typescript-eslint/ban-types
  [docSymbol]: [Doc, Function];
};
export type ComponentProps<
  ExtraProps extends Record<string, unknown> = Record<string, unknown>,
> = ExtraProps & {
  html: typeof html;
  children: DocNode;
  context: <T>(context: Context<T>) => T | void;
  /** When streaming, an AbortSignal is passed so you can cancel work if the client disconnects */
  signal?: AbortSignal;
};
export type SyncChild = DocNode | string;
export type PossiblyAsyncChild = SyncChild | PromiseLike<SyncChild>;
export type Component<
  ExtraProps extends Record<string, unknown> = Record<string, unknown>,
> = (props: ComponentProps<ExtraProps>) => PossiblyAsyncChild;
const fragOpen = '🧩[';
const fragClose = ']🧩';
function fragmentize(fragment: DocParentNode, doc: Doc): DocNode {
  if (fragment.childNodes.length > 1) {
    const open = doc.createComment(fragOpen);
    const close = doc.createComment(fragClose);
    open[holeOrListenersOrFragmentInfoOrSuspense] = fragment;
    fragment.prepend(open);
    fragment.append(close);
    return fragment;
  }

  return fragment.childNodes[0] || doc.createComment('');
}

const _hooksE: typeof hooks.e = (state) => state.slice(1) as Children;
const _hooksN: typeof hooks.n = (fragment, toUpdate, holes, context) => {
  applyUpdates(fragment, toUpdate, holes, context);
  return fragmentize(fragment, context[docSymbol][0]);
};

const _hooksO: typeof hooks.o = (key) => contexts.get(key)!;
const docSymbol = Symbol();

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
    fragment: DocParentNode,
    updates: Update[],
    holes: unknown[],
    context: ContextObject,
  ) => DocNode;
  /** Context getter */
  o: (key: Context<unknown>) => symbol | undefined;
  /** HTML template string fn */
  s: typeof html;
  /** Symbol for document in context */
  a: typeof docSymbol;
} = TINY
  ? ({} as unknown as typeof hooks)
  : {
      e: _hooksE,
      n: _hooksN,
      o: _hooksO,
      s: html,
      a: docSymbol,
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
const modeSlash: Mode = 0 as Mode;
const modeText: Mode = 1 as Mode;
const modeWhitespace: Mode = 2 as Mode;
const modeTagname: Mode = 3 as Mode;
const modeComment: Mode = 4 as Mode;
const modePropSet: Mode = 5 as Mode;
const modePropAppend: Mode = 6 as Mode;
type Mode = (0 | 1 | 2 | 3 | 4 | 5 | 6) & {__brand: 'Mode'};

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
  let mode = modeText;
  let buffer = '';
  let quote = '';
  let current: CurrentState = TINY ? ([,] as [any]) : [hooks.t];
  let char: string;
  let propName: string;

  const commit = (field?: number) => {
    if (
      mode == modeText &&
      (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '')))
    ) {
      current.push(field ? holeOrListenersOrFragmentInfoOrSuspense : buffer);
    } else if (!current[0]) {
      /* Top level */
    } else if (mode == modeTagname && (field || buffer)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions, @typescript-eslint/no-unsafe-call
      field && buffer && hooks.t!.t();
      current[1] = field ? holeOrListenersOrFragmentInfoOrSuspense : buffer;
      mode = modeWhitespace;
    } else if (mode == modeWhitespace && buffer == '...' && field) {
      current[2].push(['...', holeOrListenersOrFragmentInfoOrSuspense]);
    } else if (mode == modeWhitespace && buffer && !field) {
      current[2].push([buffer, true]);
    } else if (mode >= modePropSet) {
      if (mode == modePropSet) {
        current[2].push(
          field
            ? buffer
              ? [propName, buffer, holeOrListenersOrFragmentInfoOrSuspense]
              : [propName, holeOrListenersOrFragmentInfoOrSuspense]
            : [propName, buffer],
        );
        mode = modePropAppend;
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
      if (mode == modeText) {
        commit();
      }

      commit(i);
    }

    for (let j = 0; j < statics[i]!.length; j++) {
      char = statics[i]![j]!;

      if (mode == modeText) {
        if (char == '<') {
          /* Commit buffer */
          commit();
          current = [current, '', []];
          mode = modeTagname;
        } else {
          buffer += char;
        }
      } else if (mode == modeComment) {
        /* Ignore everything until the last three characters are '-', '-' and '>' */
        if (buffer == '--' && char == '>') {
          mode = modeText;
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
        mode = modeText;
      } else if (!mode) {
        /* Ignore everything until the tag ends */
      } else if (char == '=') {
        mode = modePropSet;
        propName = buffer;
        buffer = '';
      } else if (
        char == '/' &&
        (mode < modePropSet || statics[i]![j + 1] == '>')
      ) {
        commit();
        if (mode == modeTagname) {
          current = current[0]!;
        }

        (mode as unknown as CurrentState) = current;
        (current = current[0]!).push(
          (mode as unknown as unknown[]).slice(1) as Ele,
        );
        mode = modeSlash;
      } else if (/[ \t\n\r]/.test(char)) {
        /* <a disabled> */
        commit();
        mode = modeWhitespace;
      } else {
        buffer += char;
      }

      if (mode == modeTagname && buffer == '!--') {
        mode = modeComment;
        current = current[0]!;
      }
    }
  }

  commit();
  return (TINY ? _hooksE : hooks.e)(current, mode);
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
export interface DocElement {
  [holeOrListenersOrFragmentInfoOrSuspense]?: Record<string, Handler>;
}
/**
 * @internal
 */
export interface DocComment {
  [holeOrListenersOrFragmentInfoOrSuspense]?: DocParentNode;
}
const setStyle = (
  style: DocHTMLElement['style'],
  key: string,
  value: unknown,
) => {
  if (key[0] == '-') {
    // eslint-disable-next-line no-implicit-coercion, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-base-to-string
    style.setProperty(key, value == null ? '' : '' + value);
  } else if (value == null) {
    (style as any)[key] = '';
  } else if (typeof value != 'number' || isNonDimensional.test(key)) {
    (style as any)[key] = value;
  } else {
    (style as any)[key] = value + 'px';
  }
};

function eventProxyCapture(this: DocElement, event: Event) {
  return this[holeOrListenersOrFragmentInfoOrSuspense]![event.type + true]!(
    event,
  );
}

function eventProxy(this: DocElement, event: Event) {
  return this[holeOrListenersOrFragmentInfoOrSuspense]![event.type + false]!(
    event,
  );
}

const setProperty = (
  dom: DocElement,
  name: string,
  oldValue: any,
  value: any,
  hydrate?: () => void,
) => {
  let useCapture: boolean | string;
  if (name == 'ref') {
    value.value = dom;
  } else if (!TINY && value instanceof Signal) {
    if (hydrate) {
      return hydrate();
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
      (dom as DocHTMLElement).style.cssText = value;
    } else {
      if (typeof oldValue == 'string') {
        /* eslint-disable-next-line no-multi-assign */
        (dom as DocHTMLElement).style.cssText = oldValue = '';
      }

      if (oldValue) {
        for (name in oldValue) {
          if (!(value && name in value)) {
            setStyle((dom as DocHTMLElement).style, name, '');
          }
        }
      }

      if (value) {
        for (name in value) {
          if (!oldValue || value[name] !== oldValue[name]) {
            setStyle((dom as DocHTMLElement).style, name, value[name]);
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
      !/^(width|height|href|list|form|tabIndex|download|rowSpan|colSpan|role)$/.test(
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
      r: DocParentNode;
      /** ToUpdate */
      l: Update[];
    }
);
type Template = ReturnType<typeof template>;
function template(
  strings: readonly string[],
  doc: Doc,
): {e: DocParentNode; t: Update[]} {
  const children = parse(strings);
  let lastHole = 0;
  function appendChildren(
    parent: DocElement | DocParentNode,
    children: Children,
    l: Location,
    toUpdate: Update[],
  ) {
    for (const child of children) {
      const cn = parent.childNodes;
      const location = [...l, cn.length];
      let node;
      if (child === holeOrListenersOrFragmentInfoOrSuspense) {
        toUpdate.push({
          e: location,
          t: lastHole++,
        });
        node = doc.createComment('');
      } else if (typeof child == 'string') {
        if ((node = cn[cn.length - 1]) && node.nodeType == 3) {
          (node as DocTextNode).nodeValue += child;
        } else {
          node = doc.createTextNode(child);
        }
      } else {
        /* `child` is Ele */
        const [type, props, ...children] = child;
        if (type === holeOrListenersOrFragmentInfoOrSuspense) {
          const childrenFrag = doc.createDocumentFragment();
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
          node = doc.createComment('');
        } else {
          let xmlns: Props[number] | undefined;
          const propertiesToSet: [
            string,
            true | StringOrHole | undefined,
            Location,
          ][] = [];
          for (const prop of props) {
            if (prop[0] == 'xmlns') {
              xmlns = prop;
            } else if (prop.includes(holeOrListenersOrFragmentInfoOrSuspense)) {
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
              propertiesToSet.push([name, value, location]);
            }
          }

          node = doc.createElementNS(
            xmlns
              ? xmlns.length > 2
                ? xmlns.slice(1).join('')
                : xmlns[1]!.toString()
              : ({
                  math: 'http://www.w3.org/1998/Math/MathML',
                  svg: 'http://www.w3.org/2000/svg',
                }[type] ??
                  parent?.namespaceURI ??
                  'http://www.w3.org/1999/xhtml'),
            type,
          );

          for (const [name, value, location] of propertiesToSet) {
            setProperty(node, name, null, value, (_?: never) =>
              toUpdate.push({
                e: location,
                n: [name, [0, value]],
              }),
            );
          }

          appendChildren(node, children as Children, location, toUpdate);
        }
      }

      parent.append(node);
    }
  }

  const frag = doc.createDocumentFragment();
  const toUpdate: Update[] = [];
  appendChildren(frag, children, [], toUpdate);
  return {
    e: frag,
    t: toUpdate,
  };
}

function replaceWith(oldNode: DocChildNode, newNode: DocNode) {
  if (newNode !== oldNode) {
    if (
      oldNode.nodeType == 8 &&
      (oldNode as DocComment).nodeValue == fragOpen
    ) {
      const fragment = (oldNode as DocComment)[
        holeOrListenersOrFragmentInfoOrSuspense
      ]!;
      for (let depth = 0; ; ) {
        const next = oldNode.nextSibling;
        depth +=
          oldNode.nodeType == 8
            ? (oldNode as DocComment).nodeValue == fragOpen
              ? 1
              : (oldNode as DocComment).nodeValue == fragClose
                ? -1
                : 0
            : 0;
        if (!next || !depth) break;
        fragment.append(oldNode);
        oldNode = next;
      }
    }

    (oldNode.parentNode! as DocParentNode).replaceChild(newNode, oldNode);
  }
}

const effectCleanup = /* #__PURE__ */ new FinalizationRegistry<() => void>(
  (fn) => fn(),
);

function applyUpdates(
  fragment: DocParentNode,
  updates: Update[],
  holes: unknown[],
  context: ContextObject,
) {
  const [doc, nodeClass] = context[docSymbol];
  const parseUpdateProp = (updateProp: UpdateProp): [string, unknown] => {
    let hasSignal;
    let hole: unknown;
    const [name, ...value] = updateProp.map((propPart) => {
      // eslint-disable-next-line no-return-assign
      return Array.isArray(propPart)
        ? propPart[0]
          ? TINY
            ? holes[propPart[1]]
            : (hole = holes[propPart[1]]) instanceof Signal
              ? ((hasSignal = true), hole)
              : hole
          : propPart[1]
        : propPart;
    });
    return [
      name as string,
      !TINY && hasSignal
        ? value.length > 1
          ? computed(() => value.join(''))
          : (value[0] as Signal)
        : value.length > 1
          ? value.join('')
          : value[0],
    ];
  };

  const holeToNode = (hole: unknown): DocNode => {
    const frag = doc.createDocumentFragment();
    const children = (
      Array.isArray(hole) ? hole.flat(Infinity) : [hole]
    ) as unknown[];
    for (let item of children) {
      if (item == null || /boolean|function|symbol/.test(typeof item)) continue;
      const signal = item;
      if (!TINY && signal instanceof Signal) {
        const anchor = doc.createComment('⚓');
        (item = doc.createDocumentFragment()).append(
          anchor,
          doc.createComment(''),
        );
        effectCleanup.register(
          anchor,
          effect(() => {
            replaceWith(anchor.nextSibling!, holeToNode(signal.value));
          }),
        );
      }

      const result =
        item instanceof nodeClass
          ? (item as DocNode)
          : doc.createTextNode(item as string);
      if (children.length == 1) return result;
      frag.append(result);
    }

    return fragmentize(frag, doc);
  };

  for (const [update, node] of updates.map(
    (update) =>
      [
        update,
        // eslint-disable-next-line unicorn/no-array-reduce
        update.e.reduce<DocParentNode | DocChildNode>(
          (node, i) => (node as DocParentNode).childNodes[i]!,
          fragment,
        ) as DocChildNode,
      ] as const,
  )) {
    /* If update.t is undefined this is NaN which is falsy, if it's 0 it's still true, which saves space :D */
    if (update.t! + 1) {
      const hole = holes[update.t!]!;
      replaceWith(node, holeToNode(hole));
    } else if (update.n) {
      const [name, value] = parseUpdateProp(update.n);
      setProperty(node as DocElement, name, null, value);
    } else {
      // Component
      const children = update.r!.cloneNode(true) as DocParentNode;
      const props: ComponentProps = {
        children,
        html: html.bind(context),
        // eslint-disable-next-line @typescript-eslint/no-loop-func, @typescript-eslint/no-unsafe-return
        context: (key) => context[(TINY ? _hooksO : hooks.o)(key)!] as any,
      };
      for (const item of update.s!) {
        const [name, value] = parseUpdateProp(item);
        Object.assign(props, name == '...' ? value : {[name]: value});
      }

      let contextSymbol;
      if (
        (contextSymbol = (TINY ? _hooksO : hooks.o)(
          holes[update.o!] as Context<unknown>,
        ))
      ) {
        context = Object.create(context) as ContextObject;
        context[contextSymbol] = props['value'];
      }

      const fn = holes[update.o!] as Component;
      if (fn == Suspense) {
        const promises: SuspenseInfo = [];
        context[holeOrListenersOrFragmentInfoOrSuspense] = promises;
        queueMicrotask(() => {
          if (promises.length > 0) {
            const previous = node.previousSibling;
            const parent = node.parentNode! as DocParentNode;
            replaceWith(
              node,
              holeToNode(
                (props as unknown as Parameters<typeof Suspense>[0]).fallback,
              ),
            );
            const fallback = previous
              ? previous.nextSibling!
              : parent.childNodes[0]!;
            Promise.all(promises).then(() => {
              replaceWith(fallback, children);
            }, console.error);
          } else {
            replaceWith(node, children);
          }
        });
      }

      applyUpdates(children, update.l!, holes, context);
      props.children = fragmentize(props.children as DocParentNode, doc);
      if (fn == Suspense) {
        props.children = node as unknown as DocParentNode;
      }

      const possiblyAsyncNode = TINY ? fn(props) : untracked(() => fn(props));
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
  // @ts-expect-error this is an implementation detail
  const context = this as ContextObject;
  let tmpl = cache.get(strings);
  if (!tmpl) {
    cache.set(strings, (tmpl = template(strings, context[docSymbol][0])));
  }

  return (TINY ? _hooksN : hooks.n)(
    tmpl.e.cloneNode(true) as DocParentNode,
    tmpl.t,
    holes,
    context,
  );
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
/** @ts-ignore **/
type GlobalDocument = typeof globalThis.document;
type NativeDocument = typeof globalThis extends {document: any}
  ? GlobalDocument
  : never;

function render<D extends Doc = NativeDocument>(
  component: Component<Record<never, never>>,
  // eslint-disable-next-line @typescript-eslint/ban-types
  doc: [D | Doc, Function] | undefined = [
    (globalThis as any).document,
    (globalThis as any).Node,
    // eslint-disable-next-line @typescript-eslint/ban-types
  ] as [Doc, Function],
): ReturnType<ReturnType<D['createComment']>['cloneNode']> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return html.bind({
    [docSymbol]: doc,
  } satisfies ContextObject)`<${component}/>` as any;
}

export {createContext, hooks as _h, render, Suspense};
