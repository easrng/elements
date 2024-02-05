import {Readable} from 'node:stream';
import type {ReadableStream as nodeReadableStream} from 'node:stream/web';
import {DOMParser} from 'linkedom';
import express from 'express';
import {html} from '../../dist/elements.js';
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

const box = ({
  color,
  text,
  children,
}: {
  color: string;
  text: string;
  children: Node;
}) => {
  return html`
    <div
      style=${{backgroundColor: color, color: text || '#fff', padding: '0.5em'}}
    >
      ${children}
    </div>
  `;
};

const delay = async ({
  duration,
  children,
  signal,
}: {
  duration: string;
  children: Node;
  signal: AbortSignal;
}) => {
  await new Promise<void>((resolve, reject) => {
    let done = false;
    setTimeout(
      () => {
        resolve();
        done = true;
      },
      Number.parseInt(duration, 10),
    );
    signal.addEventListener('abort', () => {
      if (!done) {
        console.log('abort');
        reject();
      }
    });
  });
  return html`${children}`;
};

const app = express();
app.get('/', (_request, response) => {
  stream(
    html`<html><head><title>${'Hello World!'}</title></head><body><h1 ...${{style: {color: 'red'}}} title="hovered!">i am red and hoverable</h1><${box} color="darkred" ...${{text: 'pink'}}>some red stuff</><div>${html`<b>fragment</b>!`}</div><h2>slow:</h2><${delay} duration="${2000}">waited 2 seconds</></body></html>`,
  ).pipe(response);
});
app.listen(8000, () => {
  console.log('Listening on port 8000');
});
