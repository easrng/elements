/* eslint-disable no-alert */
import {
  type Component,
  createContext,
  Suspense,
  render,
  signal,
  computed,
  effect,
} from '../../dist/elements.js';
import '../../dist/debug.js';

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
  '!missing comment close'() {
    // prettier-ignore
    document.body.append(
      render(({html}) => html`<!-- should not show up`)
    );
  },
  '!extra closing tag'() {
    document.body.append(
      render(({html}) => html`<h1>should not show up</h1></`),
    );
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
      effect(() => console.log(name));
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
