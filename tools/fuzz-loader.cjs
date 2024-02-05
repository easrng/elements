const {register} = require('node:module');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

register('ts-node/esm', pathToFileURL(path.join(__dirname, '../')));
let fuzzFn = () => {
  console.log('loading fuzz');
  fuzzFn = () => {};
};

import('./fuzz.ts')
  .then((imported) => {
    fuzzFn = imported.fuzz;
    console.log('loaded fuzz');
  })
  .catch((error) => {
    fuzzFn = () => {
      throw error;
    };
  });
module.exports = {
  fuzz(buffer) {
    fuzzFn(buffer);
  },
};
