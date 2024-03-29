/* eslint-disable no-alert */
import {html} from '../../dist/elements.js';
import '../../dist/debug.js';

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

const cases = {
  'valid html with no holes'() {
    document.body.append(html`<h1 title="uwu">hover me for uwu</h1>`);
  },
  'valid html with content holes'() {
    document.body.append(html`<h1 title="owo">hover me for ${'owo'}</h1>`);
  },
  '!missing closing tag'() {
    // prettier-ignore
    document.body.append(html`<h1>should not show up`);
  },
  '!missing comment close'() {
    // prettier-ignore
    document.body.append(html`<!-- should not show up`);
  },
  '!extra closing tag'() {
    document.body.append(html`<h1>should not show up</h1></`);
  },
  'props with holes'() {
    document.body.append(html`<h1 style=${{color: 'red'}}>i am red</h1>`);
  },
  'props mix static and holes'() {
    document.body.append(html`<h1 style="color:${'green'}">i am green</h1>`);
  },
  'event handlers'() {
    document.body.append(
      html`<button onClick=${() => alert('hello!')}>i am clickable</button>`,
    );
  },
  'render component'() {
    document.body.append(
      html`<${box} color="darkred">some red stuff <button onClick=${() => alert('hello!')}>i am clickable</button></>`,
    );
  },
  'spread component props'() {
    document.body.append(
      html`<${box} ...${{color: 'pink'}} ...${{text: 'red'}}>pink!</>`,
    );
  },
  'spread element props'() {
    document.body.append(
      html`<div ...${{style: {color: 'red'}}} ...${{title: 'idk'}}>hover me</>`,
    );
  },
  'render fragment'() {
    document.body.append(html`<span>awawa</span>!`);
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
