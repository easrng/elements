import { DOMParser, Node } from "jsr:@b-fuze/deno-dom";
// @deno-types="../../dist/core.d.ts"
import { createContext, Suspense } from "../../dist/core.js";
import type { Component } from "../../dist/core.d.ts";
// @deno-types="../../dist/server.d.ts"
import { stream } from "../../dist/server.js";
import { computed, signal} from "@preact/signals-core";

const document = new DOMParser().parseFromString("", "text/html")!;

const box: Component<{
  color: string;
  text: string;
}> = ({
  color,
  text,
  children,
  html,
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

const delay: Component<{
  duration: string;
}> = async ({
  duration,
  children,
  signal,
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
    if (signal) {
      signal.addEventListener("abort", () => {
        if (!done) {
          reject(new Error("aborted"));
        }
      });
    }
  });
  return children;
};

const exampleContext = createContext<string>();
const contextValue: Component = ({ context }) => {
  return context(exampleContext) || "";
};

const indirect: Component = ({ html, children }) => {
  return html`<div><${contextValue} /><br />${children}</div>`;
};

const appComponent: Component = ({ html }) => {
  const signals = signal("signals")
  return html`<html><head><title>${"Hello World!"}</title></head><body><h1 ...${{
    style: { color: "red" },
  }} title="hovered!">i am red and hoverable</h1><${box} color="darkred" ...${{
    text: "pink",
  }}>some red stuff</><div>${html`<b>fragment</b>!`}</div><${exampleContext} value="hello contexts"><${indirect}><${contextValue} /><br /><${exampleContext} value="hello nested contexts"><${contextValue} /></></></><br/>${computed(() => signals.value + ' uwu')}<h2>slow:</h2><${Suspense} fallback=${html`Loading...`}><${delay} duration="${2000}">waited 2 seconds</></></body></html>`;
}

Deno.serve(
  (_request) =>
    new Response(
      stream(appComponent, document, Node),
      {
        headers: {
          "content-type": "text/html;charset=utf-8",
        },
      },
    ),
);
