import {type Buffer} from 'node:buffer';
import {parseHTML, Node} from 'linkedom';
import '@easrng/elements/server';
import '@easrng/elements/debug';
import {minifyStatics} from '../src/minify/core.js';
import type * as elementTypes from '../src/elements.js';

const {_h} = (await import(
  '@easrng/elements' as string
)) as typeof elementTypes;

const {document} = parseHTML('<!doctype html>');
const html = _h.s.bind({
  [_h.a]: [document, Node],
}) as unknown as (s: readonly string[]) => Node;
const wrap = document.createElement('div');
// eslint-disable-next-line @typescript-eslint/ban-types
export function fuzz(buffer: Buffer) {
  const s = buffer.toString().split('\0');
  try {
    wrap.textContent = '';
    wrap.append(html(s));
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
      (error.message.includes('unclosed') ||
        error.message.includes('extra closing tag'))
    ) {
      return;
    }

    console.error(s);
    throw error;
  }
}
