import {type Buffer} from 'node:buffer';
import {parseHTML} from 'linkedom';
import {type _h as _hType} from '../src/core.js';
// @ts-expect-error internal shit, here be dragons
import {_h as _hValue} from '../dist/elements.js';
import '../dist/server.js';
import '../dist/debug.js';

// @ts-expect-error internal shit, here be dragons
const _h = _hValue as typeof _hType;

const {document} = parseHTML('<!doctype html>');
globalThis.document = document;
const html = _h.s;
// eslint-disable-next-line @typescript-eslint/ban-types
export function fuzz(buffer: Buffer) {
  const s = buffer.toString().split('\0');
  try {
    html(s);
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
