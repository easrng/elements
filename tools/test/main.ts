/* eslint-disable no-alert */
import {html} from '../../dist/index.js';
import '../../dist/debug.js';

const cases = {
  'valid html with no holes'() {
    document.body.append(html`<h1 title="uwu">hover me for uwu</h1>`);
  },
  '!missing closing tag'() {
    document.body.append(html`<h1>should not show up</h1>`);
  },
  '!extra closing tag'() {
    document.body.append(html`<h1>should not show up</h1></`);
  },
  holes() {
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
