let fuzzFunction = () => {
  console.log('loading fuzz');
  fuzzFunction = () => {};
};

import('tsx')
  .then(() => import('./fuzz.ts'))
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
