import {Readable} from 'node:stream';
import type {ReadableStream as nodeReadableStream} from 'node:stream/web';
import {DOMParser} from 'linkedom';
import express from 'express';
import {
  signal,
  computed,
  createContext,
  Suspense,
  type Component,
} from '../../dist/elements.js';
import {stream as streamWeb} from '../../dist/server.js';

const stream = (node: Parameters<typeof streamWeb>[0]) =>
  Readable.fromWeb(
    streamWeb(node, {
      // Linkedom doesn't properly support <template> tags.
      disableTemplate: true,
    }) as nodeReadableStream,
  );

const document_ = new DOMParser().parseFromString('', 'text/html');
(globalThis as unknown as Record<'document', typeof document_>).document =
  document_;

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
          console.log('abort');
          reject();
        }
      });
    }
  });
  return children;
};

const exampleCtx = createContext<string>();
const contextValue: Component = ({context}) => {
  return context(exampleCtx) || '';
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
  }}>some red stuff</><div>${html`<b>fragment</b>!`}</div><${exampleCtx} value="hello contexts"><${indirect}><${contextValue} /><br /><${exampleCtx} value="hello nested contexts"><${contextValue} /></></></><br/>${computed(() => signals.value + ' uwu')}<h2>slow:</h2><${Suspense} fallback=${html`Loading...`}><${delay} duration="${2000}">waited 2 seconds</></></body></html>`;
};

const app = express();
app.get('/', (_request, response) => {
  response.header('content-type', 'text/html;charset=utf-8');
  stream(appComponent).pipe(response);
});
app.listen(8000, () => {
  console.log('Listening on port 8000');
});
