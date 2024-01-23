import {_h, type Children} from './index.js';

type Mode = Parameters<typeof _h.p>[1];
const comment = 4 as Mode;
_h.p = (state, mode) => {
  if (mode === comment) {
    throw new Error('unclosed comment');
  }

  if (state[0] && state[0] !== _h.c) {
    throw new Error('unclosed <' + state[1].toString() + '> tag');
  }

  return state.slice(1) as Children;
};

_h.c = new Proxy(
  {},
  {
    get() {
      throw new Error('extra closing tag');
    },
  },
);