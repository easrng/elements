import {Signal} from '@preact/signals-core';
import {
  _h,
  type ContextObject,
  type Component,
  type ComponentProps,
  type Context,
  type Doc,
  type DocParentNode,
  type DocNode,
  type DocComment,
  type DocElement,
} from './core.js';

type Update = Parameters<typeof _h.n>[1][0];
type Template = [DocParentNode, Update[], unknown[], ContextObject];
const streamMap = new WeakMap<DocNode, Template>();
const isStream = Symbol();

type ChildrenNode = DocComment & {
  __children?: () => ReturnType<typeof renderStream>;
};
const oldHookN = _h.n;
_h.n = (fragment, updates, holes, context) => {
  if (context[isStream]) {
    const node = context[_h.a][0].createDocumentFragment();
    node.append(context[_h.a][0].createComment('rendering in streaming mode'));
    streamMap.set(node, [fragment, updates, holes, context]);
    return node;
  }

  return oldHookN(fragment, updates, holes, context);
};

type UpdateTree = {
  [_: number]: UpdateTree;
  updates?: Update[];
};

const escapeString = (s: string) =>
  // eslint-disable-next-line no-control-regex, unicorn/prefer-code-point
  s.replace(/[&\u000A<>'"]/g, (char) => '&#' + char.charCodeAt(0) + ';');

type UpdateProp = Exclude<Update['n'], undefined>;

const jsToCss: Record<string, string> = {};
const isNonDimensional =
  /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
function styleObjectToCss(s: Record<string, unknown>) {
  let string = '';
  for (const prop in s) {
    if (!Object.hasOwn(s, prop)) continue;

    const value = s[prop];
    if (value != null && value !== '') {
      const name =
        prop[0] == '-'
          ? prop
          : jsToCss[prop] ||
            (jsToCss[prop] = prop.replace(/[A-Z]/g, '-$&').toLowerCase());
      const suffix =
        typeof value != 'number' || isNonDimensional.test(name) ? ';' : 'px;';
      string = string + name + ':' + (value as string) + suffix;
    }
  }

  return string;
}

const propToHtml: Record<string, string> = {
  className: 'class',
  acceptCharset: 'accept-charset',
  httpEquiv: 'http-equiv',
};

const htmlLowerCase =
  /^accessK|^auto[A-Z]|^ch|^col|cont|cross|dateT|encT|form[A-Z]|frame|hrefL|inputM|maxL|minL|noV|playsI|readO|rowS|spellC|src[A-Z]|tabI|item[A-Z]/;
const setProperty = (dom: DocElement, name: string, value: any) => {
  if (name == '...') {
    /* eslint-disable-next-line guard-for-in */
    for (const spreadName in value) {
      setProperty(dom, spreadName, value[spreadName]);
    }

    return;
  }

  if (name == 'style' && typeof value != 'string' && value) {
    value = styleObjectToCss(value as Record<string, unknown>);
  }

  if (!/^on|[\s\n\\/='"\0<>]/.test(name)) {
    /* Aria- and data- attributes have no boolean representation. */
    /* A `false` value is different from the attribute not being */
    /* present, so we can't remove it. For non-boolean aria */
    /* attributes we could treat false as a removal, but the */
    /* amount of exceptions would cost too many bytes. On top of */
    /* that other frameworks generally stringify `false`. */

    if (/function|symbol/.test(typeof value)) {
      /* Never serialize functions as attribute values */
    } else if (
      value != null &&
      (value !== false || name[4] == '-' || name == 'draggable')
    ) {
      name = propToHtml[name] || name;
      if (htmlLowerCase.test(name)) {
        name = name.toLowerCase();
      }

      dom.setAttribute(name, value as string);
    }
  }
};

type ComponentThenable = PromiseLike<DocNode | string>;
type Options = {
  disableTemplate: boolean;
};

function* renderStream(
  node: DocParentNode,
  updateTree: UpdateTree,
  holes: unknown[],
  signal: AbortSignal,
  options: Options,
  context: ContextObject,
): Generator<string | ComponentThenable, void, string | DocNode | undefined> {
  const [doc] = context[_h.a];
  const parseUpdateProp = (updateProp: UpdateProp): [string, unknown] => {
    const [name, ...value] = updateProp.map((propPart) =>
      Array.isArray(propPart)
        ? propPart[0]
          ? holes[propPart[1]]
          : propPart[1]
        : propPart,
    );
    return [name as string, value.length > 1 ? value.join('') : value[0]];
  };

  function renderBasic(node: DocNode | string, options: Options) {
    const {disableTemplate} = options;
    const t = doc.createElement(disableTemplate ? 'div' : 'template');
    (disableTemplate
      ? t
      : (t as DocElement & {content: DocParentNode}).content
    ).append(
      typeof node === 'object' && 'cloneNode' in node
        ? node.cloneNode(true)
        : node,
    );
    return t.innerHTML;
  }

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]!;
    const updateNode = updateTree[i];
    // eslint-disable-next-line no-labels
    block: {
      if (updateNode) {
        if (updateNode.updates) {
          for (const update of updateNode.updates) {
            if (update.t! + 1) {
              const hole = holes[update.t!]!;
              for (let node of (
                (Array.isArray(hole)
                  ? hole.flat(Infinity)
                  : [hole]) as unknown[]
              ).filter(
                (item) =>
                  !(
                    item == null || /boolean|function|symbol/.test(typeof item)
                  ),
              )) {
                if (node instanceof Signal) {
                  node = node.value as unknown;
                }

                if (streamMap.has(node as DocNode)) {
                  yield* streamNode(node as DocNode, signal, options);
                } else if (
                  typeof node === 'object' &&
                  node &&
                  '__children' in node
                ) {
                  yield* (node as ChildrenNode).__children!();
                } else {
                  yield renderBasic(node as string | DocNode, options);
                }
              }

              // eslint-disable-next-line no-labels
              break block;
            } else if (update.n) {
              const [name, value] = parseUpdateProp(update.n);
              setProperty(child as DocElement, name, value);
            } else {
              // Component
              const children: ChildrenNode = doc.createComment('');
              // eslint-disable-next-line @typescript-eslint/no-loop-func
              children.__children = () =>
                renderStream(
                  update.r!.cloneNode(true) as DocParentNode,
                  treeifyUpdates(update.l!),
                  holes,
                  signal,
                  options,
                  context,
                );
              const props: ComponentProps = {
                children,
                html: _h.s.bind(context),
                // eslint-disable-next-line @typescript-eslint/no-loop-func, @typescript-eslint/no-unsafe-return
                context: (key) => context[_h.o(key)!] as any,
                signal,
              };
              for (const item of update.s!) {
                const [name, value] = parseUpdateProp(item);
                Object.assign(props, name === '...' ? value : {[name]: value});
              }

              let contextSymbol: symbol | void;
              if (
                (contextSymbol = _h.o(holes[update.o!] as Context<unknown>) as
                  | symbol
                  | void)
              ) {
                context = {...context, [contextSymbol]: props['value']};
              }

              let component = (holes[update.o!] as Component)(props);
              if (typeof component === 'string') {
                yield escapeString(component);
              } else {
                if ('then' in component) {
                  component = (yield component)!;
                }

                if (typeof component === 'string') {
                  yield escapeString(component);
                } else {
                  yield* streamNode(component, signal, options);
                }
              }
            }
          }
        }

        if (child.nodeType === 1) {
          const noChildren = child.cloneNode(false);
          const outer = (noChildren as DocElement).outerHTML;
          const tag = /^<([^\s>]+)/.exec(outer)![1]!;
          if (
            outer.endsWith(`</${tag}>`) &&
            (child as DocElement).childNodes.length > 0
          ) {
            const open = outer.slice(0, -1 * (tag.length + 3));
            const close = outer.slice(-1 * (tag.length + 3));
            yield open;
            yield* renderStream(
              child as DocElement,
              updateNode,
              holes,
              signal,
              options,
              context,
            );
            yield close;
          } else {
            yield outer;
          }
        }
      } else {
        yield renderBasic(child, options);
      }
    }
  }
}

function treeifyUpdates(updates: Update[]) {
  const updateTree: UpdateTree = {};
  for (const update of updates) {
    let t = updateTree;
    for (const index of update.e) {
      const o = t[index] || {};
      t[index] = o;
      t = o;
    }

    const u = t.updates || [];
    u.push(update);
    t.updates = u;
  }

  return updateTree;
}

function* streamNode(
  node: DocNode | ChildrenNode,
  signal: AbortSignal,
  options: Options,
) {
  if (typeof node === 'object' && node && '__children' in node) {
    yield* node.__children!();
    return;
  }

  const [fragment, updates, holes, context] = streamMap.get(node)!;
  yield* renderStream(
    fragment,
    treeifyUpdates(updates),
    holes,
    signal,
    options,
    context,
  );
}

const encoder = new TextEncoder();
const empty = new Uint8Array(0);
export function stream(
  component: Component<Record<never, never>>,
  doc: Doc,
  // eslint-disable-next-line @typescript-eslint/ban-types
  nodeClass: Function,
) {
  const node = _h.s.bind({
    [_h.a]: [doc, nodeClass],
    [isStream]: true,
  })`<${component}/>`;
  const abortController = new AbortController();
  const checkTemplate = doc.createElement('template');
  (checkTemplate as DocElement & {content: DocParentNode}).content.append('x');
  const gen = streamNode(node, abortController.signal, {
    disableTemplate: checkTemplate.innerHTML !== 'x',
  });
  let passBack: string | DocNode | undefined;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('<!doctype html>'));
    },
    async pull(controller) {
      try {
        const n = gen.next(passBack);
        if (n.done) {
          return controller.close();
        }

        const value = n.value;
        if (typeof value === 'string') {
          controller.enqueue(encoder.encode(value));
        } else {
          controller.enqueue(empty);
          passBack = await value;
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          abortController.abort();
        }

        controller.error(error);
      }
    },
    cancel() {
      abortController.abort();
    },
  });
}
