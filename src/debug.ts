import {_h, type Children} from './index.js';

type Mode = Parameters<typeof _h.e>[1];
const comment = 4 as Mode;
_h.e = (state, mode) => {
  if (mode === comment) {
    throw new Error('unclosed comment');
  }

  if (state[0] && state[0] !== _h.t) {
    throw new Error('unclosed <' + state[1].toString() + '> tag');
  }

  return state.slice(1) as Children;
};

_h.t = new Proxy(
  {},
  {
    get() {
      throw new Error('extra closing tag');
    },
  },
);
