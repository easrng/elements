import {type Buffer} from 'node:buffer';
import {parseHTML} from 'linkedom';
import {_h} from '@easrng/elements';
import '@easrng/elements/server';
import '@easrng/elements/debug';
import {minifyStatics} from '../src/minify/core.js';

const {document} = parseHTML('<!doctype html>');
globalThis.document = document;
const html = _h.s;
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
