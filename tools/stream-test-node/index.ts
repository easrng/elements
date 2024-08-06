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

const nsTest: Component = ({html}) => {
  return html` <p>
    Here's an SVG:<br />
    <svg width="200" height="250">
      <rect
        x="10"
        y="10"
        width="30"
        height="30"
        stroke="black"
        fill="transparent"
        stroke-width="5"
      />
      <rect
        x="60"
        y="10"
        rx="10"
        ry="10"
        width="30"
        height="30"
        stroke="black"
        fill="transparent"
        stroke-width="5"
      />

      <circle
        cx="25"
        cy="75"
        r="20"
        stroke="red"
        fill="transparent"
        stroke-width="5"
      />
      <ellipse
        cx="75"
        cy="75"
        rx="20"
        ry="5"
        stroke="red"
        fill="transparent"
        stroke-width="5"
      />

      <line
        x1="10"
        x2="50"
        y1="110"
        y2="150"
        stroke="orange"
        stroke-width="5"
      />
      <polyline
        points="60 110 65 120 70 115 75 130 80 125 85 140 90 135 95 150 100 145"
        stroke="orange"
        fill="transparent"
        stroke-width="5"
      />

      <polygon
        points="50 160 55 180 70 180 60 190 65 205 50 195 35 205 40 190 30 180 45 180"
        stroke="green"
        fill="transparent"
        stroke-width="5"
      />

      <path
        d="M20,230 Q40,205 50,230 T90,230"
        fill="none"
        stroke="blue"
        stroke-width="5"
      />
    </svg>
    <br />
    and one with MathML in it:<br />
    <style>
      foreignObject {
        color: white;
        font: 18px serif;
        height: 100%;
        overflow: auto;
      }
    </style>
    <svg width="200" height="200">
      <polygon points="5,5 195,10 185,185 10,195" />
      <foreignObject x="20" y="20" width="160" height="160">
        <!--
          in normal html you'd need to add an xmlns yourself,
          but @easrng/elements sets the SVG and MathML namespaces on
          <svg> and <math> tags automatically.
        -->
        <math style="font-size: 40px">
          <mfrac>
            <mn>1</mn>
            <msqrt>
              <mn>2</mn>
            </msqrt>
          </mfrac>
        </math>
      </foreignObject>
    </svg>
  </p>`;
};

const appComponent: Component = ({html}) => {
  const signals = signal('signals');
  return html`
    <html>
      <head>
        <title>${'Hello World!'}</title>
      </head>
      <body>
        <h1 ...${{style: {color: 'red'}}} title="hovered!">i am red and hoverable</h1>
        <${box} color="darkred" ...${{text: 'pink'}}>some red stuff</>
        <div>${html`<b>fragment</b>!`}</div>
        <${exampleContext} value="hello contexts">
          <${indirect}>
            <${contextValue} /><br />
            <${exampleContext} value="hello nested contexts">
              <${contextValue} />
            </>
          </>
        </><br />
        ${computed(() => signals.value + ' uwu')}
        <${nsTest}/>
        <h2>slow:</h2>
        <${Suspense} fallback=${html`Loading...`}>
          <${delay} duration="${2000}">waited 2 seconds</>
        </>
      </body>
    </html>`;
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
