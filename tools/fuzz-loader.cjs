const {register} = require('node:module');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

register('ts-node/esm', pathToFileURL(path.join(__dirname, '../')));
let fuzzFunction = () => {
  console.log('loading fuzz');
  fuzzFunction = () => {};
};

import('./fuzz.ts')
  .then((imported) => {
    fuzzFunction = imported.fuzz;
    console.log('loaded fuzz');
  })
  .catch((error) => {
    fuzzFunction = () => {
      throw error;
    };
  });
module.exports = {
  fuzz(buffer) {
    fuzzFunction(buffer);
  },
};
