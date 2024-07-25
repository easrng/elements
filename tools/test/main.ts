/* eslint-disable no-alert */
import type * as elementsTypes from '@easrng/elements';

type Component<T extends Record<string, unknown> = Record<string, unknown>> =
  elementsTypes.Component<T>;
let createContext: typeof elementsTypes.createContext;
// eslint-disable-next-line @typescript-eslint/naming-convention
let Suspense: typeof elementsTypes.Suspense;
let render: typeof elementsTypes.render;
let signal: typeof elementsTypes.signal;
let computed: typeof elementsTypes.computed;
let effect: typeof elementsTypes.effect;

const tiny = new URLSearchParams(location.search).has('tiny');
if (tiny) {
  // With tiny signals are treated as normal values, but I didn't want to stub them.
  ({signal, computed, effect} = await import('@preact/signals-core'));
  ({createContext, Suspense, render} = await import('@easrng/elements/tiny'));
} else {
  ({createContext, Suspense, render, signal, computed, effect} = await import(
    '@easrng/elements'
  ));
  await import('@easrng/elements/debug');
}

const box: Component<{
  color: string;
  text: string;
}> = ({color, text, children, html}) => {
  return html`
    <div
      style=${{backgroundColor: color, color: text || '#fff', padding: '0.5em'}}
    >
      ${children}
    </div>
  `;
};

const time = signal<number>(Date.now());
const timeText = computed(() => new Date(time.value).toLocaleTimeString());
setInterval(() => {
  time.value = Date.now();
}, 1);

const cases = {
  'valid html with no holes'() {
    document.body.append(
      render(({html}) => html`<h1 title="uwu">hover me for uwu</h1>`),
    );
  },
  'valid html with content holes'() {
    document.body.append(
      render(({html}) => html`<h1 title="owo">hover me for ${'owo'}</h1>`),
    );
  },
  '!missing closing tag'() {
    // prettier-ignore
    document.body.append(
      render(({html}) => html`<h1>should not show up`)
    );
  },
  '!missing comment close in tag'() {
    // prettier-ignore
    document.body.append(
      render(({html}) => html`<h1><!-- should not show up</h1>`)
    );
  },
  '!extra closing tag'() {
    document.body.append(
      render(({html}) => html`<h1>should not show up</h1></`),
    );
  },
  '!bad hole positioning'() {
    document.body.append(
      render(({html}) => html`<h1${0}>should not show up</h1></`),
    );
  },
  // 'hole after /'() {
  //   // This is weird, don't do it, but fuzzing picked it up as an inconsistency,
  //   // so i wanted it documented. It'll break when minified.
  //   document.body.append(render(({html}) => html`<div/${0}>`));
  // },
  'early /'() {
    document.body.append(render(({html}) => html`<div/awawa>`));
  },
  'props with holes'() {
    document.body.append(
      render(({html}) => html`<h1 style=${{color: 'red'}}>i am red</h1>`),
    );
  },
  'props mix static and holes'() {
    document.body.append(
      render(({html}) => html`<h1 style="color:${'green'}">i am green</h1>`),
    );
  },
  'event handlers'() {
    document.body.append(
      render(
        ({html}) => html`
          <button onClick=${() => alert('hello!')}>i am clickable</button>
        `,
      ),
    );
  },
  'render component'() {
    document.body.append(
      render(
        ({html}) =>
          html`<${box} color="darkred">some red stuff <button onClick=${() => alert('hello!')}>i am clickable</button></>`,
      ),
    );
  },
  'spread component props'() {
    document.body.append(
      render(
        ({html}) =>
          html`<${box} ...${{color: 'pink'}} ...${{text: 'red'}}>pink!</>`,
      ),
    );
  },
  'spread element props'() {
    document.body.append(
      render(
        ({html}) =>
          html`<div ...${{style: {color: 'red'}}} ...${{title: 'idk'}}>hover me</>`,
      ),
    );
  },
  'render fragment'() {
    document.body.append(render(({html}) => html`<span>awawa</span>!`));
  },
  'basic context'() {
    const exampleContext = createContext<string>();
    const contextValue: Component = ({context}) => {
      return context(exampleContext) || '';
    };

    const indirect: Component = ({html, children}) => {
      return html`<div><${contextValue} /><br />${children}</div>`;
    };

    document.body.append(
      render(
        ({html}) =>
          html`<${exampleContext} value="hello contexts"><${indirect}><${contextValue} /><br /><${exampleContext} value="hello nested contexts"><${contextValue} /></></></>`,
      ),
    );
  },
  'suspense boundary'() {
    const delay: Component<{
      duration: string;
    }> = async ({duration, children}) => {
      await new Promise<void>((resolve) => {
        setTimeout(
          () => {
            resolve();
          },
          Number.parseInt(duration, 10),
        );
      });
      return children;
    };

    document.body.append(
      render(
        ({html}) =>
          html`<${Suspense} fallback=${html`Loading...`}><${delay} duration=${2000}>Delay <b>1</b></>, <${delay} duration=${4000}>Delay 2</></>`,
      ),
    );
  },
  'child signal and string interpolated prop signal'() {
    const clock: Component = ({html}) => html`
      <div title="The time is ${timeText}">The time is ${timeText}</div>
    `;
    document.body.append(render(clock));
  },
  'prop signal'() {
    const bouncy: Component = ({html}) => {
      const computedStyle = computed(() => ({
        transform: `translateY(${Math.sin(time.value / 100) / 4}em)`,
        margin: '1em 0',
      }));
      return html`<div style=${computedStyle}>bouncy</div>`;
    };

    document.body.append(render(bouncy));
  },
  'signal and ref'() {
    const form: Component = ({html}) => {
      const nameInput = signal<HTMLInputElement | undefined>(undefined);
      const name = signal('');
      effect(() => console.log('nameInput:', nameInput.value));
      return html`
        <form onsubmit=${(event: Event) => event.preventDefault()}>
          <input
            type="text"
            placeholder="What's your name?"
            ref=${nameInput}
            oninput=${() => {
              name.value = nameInput.value?.value || '';
            }}
          />
          <p style=${computed(() => ({display: name.value ? '' : 'none'}))}>
            Hello, ${name}!
          </p>
        </form>
      `;
    };

    document.body.append(render(form));
  },
  'boolean props'() {
    document.body.append(
      render(({html}) => html`<input type="checkbox" disabled checked />`),
    );
  },
  'props with really fucked up quoting'() {
    document.body.append(
      render(
        ({html}) => html`<input type=c"h${'e'}ck"'box' disabled checked />`,
      ),
    );
  },
  'prop with single quote in double quote'() {
    document.body.append(render(({html}) => html`<input value="a'wawa'" />`));
  },
  'prop with both kinds of quotes'() {
    document.body.append(render(({html}) => html`<input value="'"'"' />`));
  },
  'no gap between holes'() {
    document.body.append(render(({html}) => html`${'hello'}${'world'}`));
  },
  'child signals are not tracked in parent'() {
    const clock: Component = ({html}) => html`rendered at: ${timeText.value}`;
    let calls = 0;
    document.body.append(
      render(
        ({html}) =>
          html`${computed(
            () => html`<br />renders: ${++calls} (should stay 1) <${clock} />`,
          )}`,
      ),
    );
  },
};
for (let [name, test] of Object.entries(cases)) {
  const shouldError = name[0] === '!';
  if (shouldError) {
    name = name.slice(1);
  }

  let error;
  try {
    test();
  } catch (error_) {
    error = error_;
  }

  const passStyle = 'background:green;color:#fff;border-radius:2em;';
  const failStyle = 'background:darkred;color:#fff;border-radius:2em;';
  const nameStyle = 'font-weight:bold';
  if (error) {
    if (shouldError) {
      console.log(
        '%c PASS %c ' + name,
        passStyle,
        nameStyle,
        '\n       with expected error:\n',
        String(error)
          .split('\n')
          .map(
            (string) => '      ' + string.trim().replace(/^\w*Error:\s*/, ''),
          )
          .join('\n'),
      );
    } else {
      console.error('%c FAIL %c ' + name, failStyle, nameStyle, '\n', error);
    }
  } else if (shouldError) {
    console.error('%c FAIL %c ' + name, failStyle, nameStyle);
  } else {
    console.log('%c PASS %c ' + name, passStyle, nameStyle);
  }
}
