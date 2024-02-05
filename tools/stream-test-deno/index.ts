import {
  type DocumentFragment as DocumentFragment_,
  DOMParser,
  type Node,
} from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";
import { html } from "../../dist/elements.js";
import { stream } from "../../dist/server.js";

declare global {
  const DocumentFragment: typeof DocumentFragment_;
  const document: typeof document_;
}

const document_ = new DOMParser().parseFromString("", "text/html")!;
(globalThis as unknown as Record<"document", typeof document>).document =
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
      style=${{
    backgroundColor: color,
    color: text || "#fff",
    padding: "0.5em",
  }}
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
    signal.addEventListener("abort", () => {
      if (!done) {
        console.log("abort");
        reject();
      }
    });
  });
  return html`${children}`;
};

Deno.serve(
  (_request) =>
    new Response(
      stream(
        html`<html><head><title>${"Hello World!"}</title></head><body><h1 ...${{
          style: { color: "red" },
        }} title="hovered!">i am red and hoverable</h1><${box} color="darkred" ...${{
          text: "pink",
        }}>some red stuff</><div>${html`<b>fragment</b>!`}</div><h2>slow:</h2><${delay} duration="${2000}">waited 2 seconds</></body></html>`,
      ),
      {
        headers: {
          "content-type": "text/html",
        },
      },
    ),
);
