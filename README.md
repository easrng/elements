# `@easrng/elements`
A tiny framework powered by `@preact/signals-core`.

```ts
import {render, signal, computed, type Component} from '@easrng/elements';

const Counter: Component = ({html}) => {
  const value = signal(0);
  return html`
    <div>
      Counter: ${value} is ${computed(() => (value.value % 2 ? 'odd' : 'even'))}
    </div>
    <button onClick=${() => value.value++}>Increment</button>
    <button onClick=${() => value.value--}>Decrement</button>
  `;
};

document.body.append(render(Counter));
```

# Don't need signals?
Import `@easrng/elements/tiny` for an even smaller version with no dependencies.

# Minify your <code>html``</code> template strings for production
## Webpack and Rspack
Use `@easrng/elements/minify` as a loader.
## Rollup, Vite, and Rolldown
Add the plugin to your configuration file:
```js
import elementsMinify from '@easrng/elements/minify';

export default {
  plugins: [
    elementsMinify(),
  ],
};
```

&nbsp;  
---

More docs coming Soon™.