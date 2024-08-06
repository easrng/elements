import {_h, type Children} from './core.js';

type Mode = Parameters<typeof _h.e>[1];
const comment = 4 as Mode;
_h.e = (state, mode) => {
  if (mode === comment) {
    throw new Error('Unclosed comment');
  }

  if (state[0] && state[0] !== _h.t) {
    throw new Error('Unclosed <' + state[1].toString() + '> tag');
  }

  return state.slice(1) as Children;
};

_h.t = new Proxy(
  {},
  {
    get(_, key) {
      throw new Error(
        key == 't'
          ? `Pass either a tag name or a \${component}, not both.`
          : 'Extra closing tag',
      );
    },
  },
);
