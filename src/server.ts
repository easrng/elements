import {_h} from './core.js';

type Update = Parameters<typeof _h.n>[1][0];
type Template = [DocumentFragment, Update[], unknown[]];
const streamMap = new WeakMap<Node, Template>();

type ChildrenNode = Comment & {
  __children?: () => ReturnType<typeof renderStream>;
};
_h.n = (fragment, updates, holes) => {
  const node = document.createDocumentFragment();
  node.append(document.createComment('rendering in streaming mode'));
  streamMap.set(node, [fragment, updates, holes]);
  return node;
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
const setProperty = (dom: Element, name: string, value: any) => {
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

type ComponentThenable = PromiseLike<Node | string>;

function* renderStream(
  node: ParentNode,
  updateTree: UpdateTree,
  holes: unknown[],
  signal: AbortSignal,
): Generator<string | ComponentThenable, void, string | Node | undefined> {
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

  function renderBasic(node: Node | string) {
    const t = document.createElement('template');
    t.content.append(
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
    render: {
      if (updateNode) {
        if (updateNode.updates) {
          for (const update of updateNode.updates) {
            if (update.t! + 1) {
              const hole = holes[update.t!]!;
              for (const node of (
                (Array.isArray(hole)
                  ? hole.flat(Number.POSITIVE_INFINITY)
                  : [hole]) as unknown[]
              ).filter(
                (item) => item && !/boolean|function|symbol/.test(typeof item),
              )) {
                if (streamMap.has(node as Node)) {
                  yield* streamNode(node as Node, signal);
                } else if (
                  typeof node === 'object' &&
                  node &&
                  '__children' in node
                ) {
                  yield* (node as ChildrenNode).__children!();
                } else {
                  yield renderBasic(node as string | Node);
                }
              }

              // eslint-disable-next-line no-labels
              break render;
            } else if (update.n) {
              const [name, value] = parseUpdateProp(update.n);
              setProperty(child as Element, name, value);
            } else {
              // Component
              const children: ChildrenNode = document.createComment('');
              children.__children = () =>
                renderStream(
                  update.r!.cloneNode(true) as DocumentFragment,
                  treeifyUpdates(update.l!),
                  holes,
                  signal,
                );
              const props: any = {};
              for (const item of update.s!) {
                const [name, value] = parseUpdateProp(item);
                Object.assign(props, name === '...' ? value : {[name]: value});
              }

              props.children = children;
              props.signal = signal;
              let component = (
                holes[update.o!] as (
                  _: unknown,
                ) => Node | string | ComponentThenable
              )(props);
              if (typeof component === 'string') {
                yield escapeString(component);
              } else {
                if ('then' in component) {
                  component = (yield component)!;
                }

                if (typeof component === 'string') {
                  yield escapeString(component);
                } else {
                  yield* streamNode(component, signal);
                }
              }
            }
          }
        }

        if (child.nodeType === 1) {
          if (
            /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(
              (child as Element).tagName,
            )
          ) {
            yield (child as Element).outerHTML;
          } else {
            const inner = (child as Element).innerHTML;
            const outer = (child as Element).outerHTML;
            const closeIndex = outer.lastIndexOf('</');
            const open = outer.slice(0, closeIndex - inner.length);
            const close = outer.slice(closeIndex);
            yield open;
            yield* renderStream(child as Element, updateNode, holes, signal);
            yield close;
          }
        }
      } else {
        yield renderBasic(child);
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

function* streamNode(node: Node, signal: AbortSignal) {
  const [fragment, updates, holes] = streamMap.get(node)!;
  yield* renderStream(fragment, treeifyUpdates(updates), holes, signal);
}

const encoder = new TextEncoder();
export function stream(node: Node) {
  const abortController = new AbortController();
  const gen = streamNode(node, abortController.signal);
  let passBack: string | Node | undefined;
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
          // Make the stream flush by adding a newline
          controller.enqueue(encoder.encode('<!--\n-->'));

          passBack = await value;
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error(error);
          abortController.abort();
        }

        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });
}
