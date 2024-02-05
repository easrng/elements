import {type Buffer} from 'node:buffer';
import {parseHTML} from 'linkedom';
import {html} from '../src/elements.ts';
import '../src/server.ts';
import '../src/debug.ts';

const {document} = parseHTML('<!doctype html>');
globalThis.document = document;

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
