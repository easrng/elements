import {type Buffer} from 'node:buffer';
import {parseHTML, Node} from 'linkedom';
import {minifyStatics} from '../src/minify/core.js';
import {cook} from '../src/shared/cook.js';

// @ts-expect-error aaaaaa
globalThis.TINY = false;

const {_h} = await import('../src/elements.js');
await import('../src/debug.js');

const {document} = parseHTML('<!doctype html>');
const html = _h.s.bind({
  [_h.a]: [document, Node],
}) as unknown as (s: readonly string[], ...holes: unknown[]) => Node;
const wrap = document.createElement('div');
const process = (s: string[]) => {
  try {
    wrap.textContent = '';
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    wrap.append(html(s, ...s.slice(1).map(() => () => {})));
    const normalHtml = wrap.innerHTML;
    wrap.textContent = '';
    const minified = minifyStatics(s);
    wrap.append(html(minified));
    if (wrap.innerHTML !== normalHtml) {
      throw new Error(
        'minify mismatch:\n' +
          JSON.stringify(s) +
          '\n' +
          JSON.stringify(minified),
      );
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'message' in error &&
      typeof error.message === 'string' &&
      (error.message.includes('Unclosed') ||
        error.message.includes('Extra closing tag') ||
        error.message.includes(`Pass either a tag name or a \${component}`) ||
        error.message.includes(`Incorrect hole placement`))
    ) {
      return;
    }

    console.error(s);
    throw error;
  }
};

// eslint-disable-next-line @typescript-eslint/ban-types
export function fuzz(buffer: Buffer) {
  const s = buffer.toString().split('\0');
  process(s);
  process(s.map((e) => cook(e, true, true).cooked));
}
