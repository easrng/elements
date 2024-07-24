import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import process from 'node:process';
import type {ReadableStream as nodeReadableStream} from 'node:stream/web';
import {DOMParser, Node} from 'linkedom';
import express from 'express';
import {
  signal,
  computed,
  createContext,
  Suspense,
  type Component,
} from '@easrng/elements';
import {stream as streamWeb} from '@easrng/elements/server';

const document = new DOMParser().parseFromString('', 'text/html');
const stream = (node: Parameters<typeof streamWeb>[0]) => {
  return Readable.fromWeb(
    streamWeb(node, document, Node) as nodeReadableStream,
  );
};

const box: Component<{
  color: string;
  text: string;
}> = ({color, text, children, html}) => {
  return html`
    <div
      style=${{
        backgroundColor: color,
        color: text || '#fff',
        padding: '0.5em',
      }}
    >
      ${children}
    </div>
  `;
};

const delay: Component<{
  duration: string;
}> = async ({duration, children, signal}) => {
  await new Promise<void>((resolve, reject) => {
    let done = false;
    setTimeout(
      () => {
        resolve();
        done = true;
      },
      Number.parseInt(duration, 10),
    );
    if (signal) {
      signal.addEventListener('abort', () => {
        if (!done) {
          reject(new Error('aborted'));
        }
      });
    }
  });
  return children;
};

const exampleContext = createContext<string>();
const contextValue: Component = ({context}) => {
  return context(exampleContext) || '';
};

const indirect: Component = ({html, children}) => {
  return html`<div><${contextValue} /><br />${children}</div>`;
};

const appComponent: Component = ({html}) => {
  const signals = signal('signals');
  return html`<html><head><title>${'Hello World!'}</title></head><body><h1 ...${{
    style: {color: 'red'},
  }} title="hovered!">i am red and hoverable</h1><${box} color="darkred" ...${{
    text: 'pink',
  }}>some red stuff</><div>${html`<b>fragment</b>!`}</div><${exampleContext} value="hello contexts"><${indirect}><${contextValue} /><br /><${exampleContext} value="hello nested contexts"><${contextValue} /></></></><br/>${computed(() => signals.value + ' uwu')}<h2>slow:</h2><${Suspense} fallback=${html`Loading...`}><${delay} duration="${2000}">waited 2 seconds</></></body></html>`;
};

if (process.argv.includes('--stdout')) {
  await pipeline(stream(appComponent), process.stdout);
} else {
  const app = express();
  app.get('/', async (_request, response, next) => {
    response.header('content-type', 'text/html;charset=utf-8');
    pipeline(stream(appComponent), response).catch((error: unknown) => {
      next(error);
    });
  });
  app.listen(8000, () => {
    console.log('Listening on port 8000');
  });
}
