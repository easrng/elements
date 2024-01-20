import {_h, type Children} from './index.js';

_h.p = (state) => {
  if (state[0]) {
    throw new Error('unclosed <' + state[1].toString() + '> tag');
  }

  return state.slice(1) as Children;
};

_h.c = (state) => {
  if (!state[0]) {
    throw new Error('extra closing tag');
  }
};
