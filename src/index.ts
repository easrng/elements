/* eslint-disable max-depth, no-labels, complexity, symbol-description */
import {effect, Signal} from '@preact/signals-core';

type Child = (Signal<Node> | string | Node);
type PropsBase = Partial<{
	[key: `on${string}`]: (event: Event) => unknown;
	[key: string]: unknown;
	ref: Signal;
	style: string | Record<string, unknown>;
}>;
export type Props = PropsBase & {
	children?: Child[];
};
export type Component<T = PropsBase> = (
	props: T & {
		children?: Node;
	},
) => Node;
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace JSX {
		type IntrinsicElements = Record<string, Props>;
	}
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Node {
		[fragment]: [DocumentFragment, Node];
	}
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Element {
		[listeners]: Record<string, (event: Event) => unknown>;
	}
}
const fragment = Symbol();
const listeners = Symbol();
const cleanupEffects = new FinalizationRegistry<() => void>(fn => {
	fn();
});
const isNonDimensional
  = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
const setStyle = (
	style: CSSStyleDeclaration,
	key: string,
	value: unknown,
) => {
	if (key.startsWith('-')) {
		// eslint-disable-next-line no-eq-null, eqeqeq
		style.setProperty(key, value == null ? '' : String(value));
	} else if (value == null) { // eslint-disable-line no-eq-null, eqeqeq
		(style as any)[key] = '';
	} else if (typeof value !== 'number' || isNonDimensional.test(key)) {
		(style as any)[key] = value;
	} else {
		(style as any)[key] = value + 'px';
	}
};

const setProperty = (
	dom: Element,
	name: string,
	oldValue: any,
	value: any,
) => {
	let useCapture: boolean | string;
	o: if (name === 'style') {
		if (typeof value === 'string') {
			(dom as Element & ElementCSSInlineStyle).style.cssText = value;
		} else {
			if (typeof oldValue === 'string') {
				// eslint-disable-next-line no-multi-assign
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
	} else if (name.startsWith('o') && name[1] === 'n') {
		// Infer correct casing for DOM built-in events:
		name = (((useCapture = name.toLowerCase()) in dom) ? useCapture : name)
			.slice(2);

		useCapture
      = name !== (name = name.replace(/(PointerCapture)$|Capture$/, '$1'));

		if (!dom[listeners]) {
			dom[listeners] = {};
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		dom[listeners][name + useCapture] = value;

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
			name !== 'width'
      && name !== 'height'
      && name !== 'href'
      && name !== 'list'
      && name !== 'form'
      // Default value in browsers is `-1` and an empty string is
      // cast to `0` instead
      && name !== 'tabIndex'
      && name !== 'download'
      && name !== 'rowSpan'
      && name !== 'colSpan'
      && name !== 'role'
      && name in dom
		) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/prefer-nullish-coalescing, no-eq-null, eqeqeq
				(dom as any)[name] = value == null ? '' : value;
				// Labelled break is 1b smaller here than a return statement (sorry)
				break o;
			} catch {
				// ignore
			}
		}

		// Aria- and data- attributes have no boolean representation.
		// A `false` value is different from the attribute not being
		// present, so we can't remove it. For non-boolean aria
		// attributes we could treat false as a removal, but the
		// amount of exceptions would cost too many bytes. On top of
		// that other frameworks generally stringify `false`.

		if (typeof value === 'function') {
			// Never serialize functions as attribute values
		// eslint-disable-next-line no-eq-null, eqeqeq
		} else if (value != null && (value !== false || name[4] === '-')) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			dom.setAttribute(name, value);
		} else {
			dom.removeAttribute(name);
		}
	}
};

const registerEffect = (anchorRef: WeakRef<Node>, signal: Signal<Node>) => {
	const destroy = effect(() => {
		const anchor = anchorRef.deref();
		if (anchor) {
			const frag = fragment in anchor.nextSibling!
        && anchor.nextSibling[fragment];
			if (frag) {
				const node = frag[0];
				while (anchor.nextSibling !== frag[1]) {
					node.append(anchor.nextSibling);
				}

				const end = anchor.nextSibling;
				const temporary = document.createComment('');
				end.replaceWith(temporary);
				node.append(end);
				temporary.replaceWith(signal.value);
			} else {
				anchor.nextSibling!.replaceWith(signal.value);
			}
		} else {
			destroy();
		}
	});
	cleanupEffects.register(anchorRef.deref()!, destroy);
};

const registerPropEffect = <T>(
	elementRef: WeakRef<Element>,
	name: string,
	signal: Signal<T>,
) => {
	let oldValue: T;
	const destroy = effect(() => {
		const element = elementRef.deref();
		if (element) {
			setProperty(element, name, oldValue, oldValue = signal.value);
		} else {
			destroy();
		}
	});
	cleanupEffects.register(elementRef.deref()!, destroy);
};

const xmlns = (namespace: string) => new Proxy<Record<string, string>>({}, {
	get(_, tagName: string) {
		return [namespace, tagName];
	},
});

const jsx = (
	type: typeof fragment | string | [string, string] | Component,
	props?: Props,
): Node => {
	let node: Node;
	let endOrComponent: Comment | boolean = false;
	if (type === fragment) {
		const start = document.createComment('(🧩(');
		endOrComponent = document.createComment(')🧩)');
		node = document.createDocumentFragment();
		start[fragment] = [node as DocumentFragment, endOrComponent];
		(node as DocumentFragment).append(start);
	} else if (typeof type === 'string') {
		node = document.createElement(type);
	} else if (endOrComponent = typeof type === 'function') { // eslint-disable-line no-cond-assign
		node = document.createDocumentFragment();
	} else {
		node = document.createElementNS(...type);
	}

	if (type === fragment) {
		(node as DocumentFragment).append(endOrComponent as Comment);
	} else if (endOrComponent) {
		return (type as Component)({
			...props,
			children: node,
		});
	} else if (props) {
		// eslint-disable-next-line guard-for-in
		for (const prop in props) {
			const value = props[prop];
			if (prop === 'ref') {
				(value as Signal).value = node;
			} else if (prop === 'children') {
				for (const child of value as Child[]) {
					if (child instanceof Signal) {
						const anchor = document.createComment('⚓');
						(node as Element).append(anchor, '');
						registerEffect(new WeakRef(anchor), child);
					} else {
						(node as Element).append(child);
					}
				}
			} else if (value instanceof Signal) {
				registerPropEffect(new WeakRef(node as Element), prop, value);
			} else {
				setProperty(node as Element, prop, null, value);
			}
		}
	}

	return node;
};

function eventProxyCapture(this: Element, event: Event) {
	return this[listeners][event.type + true]!(event);
}

function eventProxy(this: Element, event: Event) {
	return this[listeners][event.type + false]!(event);
}

export * from '@preact/signals-core';
export {fragment as Fragment, jsx, jsx as jsxDEV, jsx as jsxs, xmlns};
