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
  const elements = await import('@easrng/elements');
  (window as any).elements = elements;
  ({createContext, Suspense, render, signal, computed, effect} = elements);
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
      // @elements-expect-error
      render(({html}) => html`<h1>should not show up`),
    );
  },
  '!missing closing tag (component)'() {
    const test: Component = () => 'hi!';
    // prettier-ignore
    document.body.append(
      // @elements-expect-error
      render(({html}) => html`<${test}>should not show up`),
    );
  },
  'comment in tag'() {
    document.body.append(
      render(({html}) => html`<h1><!-- should not show up --></h1>`),
    );
  },
  '!missing comment close in tag'() {
    // prettier-ignore
    document.body.append(
      // @elements-expect-error
      render(({html}) => html`<h1><!-- should not show up</h1>`),
    );
  },
  '!extra closing tag'() {
    document.body.append(
      // @elements-expect-error
      render(({html}) => html`<h1>should not show up</h1></`),
    );
  },
  '!hole and tagname'() {
    document.body.append(
      // @elements-expect-error
      render(({html}) => html`<h1${0}>should not show up</h1>`),
    );
  },
  // '!bad hole positioning'() {
  //   document.body.append(
  //     // @elements-expect-error
  //     render(({html}) => html`<h1 ${0}>should not show up</h1>`),
  //   );
  // },
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
  'mathml in html'() {
    document.body.append(
      render(
        ({html}) => html`
          <p>
            One over square root of two (inline style):
            <math>
              <mfrac>
                <mn>1</mn>
                <msqrt>
                  <mn>2</mn>
                </msqrt>
              </mfrac>
            </math>
          </p>
          <p>
            One over square root of two (display style):
            <math display="block">
              <mfrac>
                <mn>1</mn>
                <msqrt>
                  <mn>2</mn>
                </msqrt>
              </mfrac>
            </math>
          </p>
        `,
      ),
    );
  },
  'svg in html'() {
    document.body.append(
      render(
        ({html}) => html`
          <p>
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
          </p>
        `,
      ),
    );
  },
  'svg foreignObject'() {
    document.body.append(
      render(
        ({html}) => html`
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

            <!-- Common use case: embed HTML text into SVG -->
            <foreignObject x="20" y="20" width="160" height="160">
              <!--
                In the context of SVG embedded in an HTML document, the XHTML
                namespace could be omitted, but it is mandatory in the
                context of an SVG document
              -->
              <div xmlns="http://www.w3.org/1999/xhtml">
                This is an SVG${' '}
                <a
                  href="https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject"
                >
                  foreignObject
                </a>
              </div>
            </foreignObject>
          </svg>
        `,
      ),
    );
  },
  'mathml in svg'() {
    document.body.append(
      render(
        ({html}) => html`
          <svg width="200" height="200">
            <polygon points="5,5 195,10 185,185 10,195" />
            <foreignObject x="20" y="20" width="160" height="160">
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
        `,
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
