import {_h, type Children} from './index.js';

_h.p = (state) => {
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
