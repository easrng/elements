export * from '@preact/signals-core';
export const xmlns = (namespace: string) => new Proxy<Record<string, string>>({}, {
	get(_, tagName: string) {
		return [namespace, tagName];
	},
});
