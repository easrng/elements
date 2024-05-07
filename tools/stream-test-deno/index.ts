import {
  type DocumentFragment as DocumentFragment_,
  DOMParser,
} from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";
import { type Component, createContext, Suspense, signal } from "../../dist/elements.js";
import { stream } from "../../dist/server.js";
import { computed } from "../../dist/elements.js";

declare global {
  const DocumentFragment: typeof DocumentFragment_;
  const document: typeof document_;
}

const document_ = new DOMParser().parseFromString("", "text/html")!;
(globalThis as unknown as Record<"document", typeof document>).document =
  document_;

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
      stream(appComponent),
      {
        headers: {
          "content-type": "text/html;charset=utf-8",
        },
      },
    ),
);
