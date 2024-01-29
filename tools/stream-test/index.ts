import {
  DOMParser,
  type Node,
  DocumentFragment as _DocumentFragment
} from 'https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts';
import {html} from '../../dist/index.js';
import {stream} from '../../dist/server.js';

declare global {
  const DocumentFragment: typeof _DocumentFragment
  const document: typeof document_
}

const document_ = new DOMParser().parseFromString('', 'text/html')!;
(globalThis as unknown as Record<'document', typeof document>).document = document_;

const box = ({color, children}: {color: string; children: Node}) => html`
  <div style=${{backgroundColor: color, color: '#fff', padding: '0.5em'}}>
    ${children}
  </div>
`;
const delay = async ({
  duration,
  children,
  signal
}: {
  duration: string;
  children: Node;
  signal: AbortSignal
}) =>
  new Promise((resolve, reject) => {
    let done = false;
    setTimeout(() => {
      resolve(html`${children}`)
      done = true;
    }, Number.parseInt(duration, 10));
    signal.addEventListener("abort", () => {
      if(!done) {
        console.log('abort');
        reject();
      }
    })
  });

Deno.serve(
  (_request) =>
    new Response(
      stream(
        html`<html><head><title>${'Hello World!'}</title></head><body><h1 style=${{color: 'red'}}>i am red</h1><${box} color="darkred">some red stuff <button>i am clickable</button></><h2>slow:</h2>${Array.from(
          {length: 60},
        ).map((e, i) => {
          return html`<${delay} duration="${i * 1000}">${i}</>`;
        })}</body></html>`,
      ),
      {
        headers: {
          'content-type': 'text/html',
        },
      },
    ),
);
