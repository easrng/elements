import {cpus} from 'node:os';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import {type RollupOptions, type OutputOptions} from 'rollup';

const input = [
  'src/core.ts',
  'src/debug.ts',
  'src/server.ts',
  'src/elements.ts',
  'src/minify.ts',
];

const config: RollupOptions & {output: OutputOptions} = {
  input,
  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    typescript({
      emitDeclarationOnly: true,
      declaration: true,
      declarationDir: 'dist',
      include: input,
    }),
    terser(
      Object.defineProperties(
        {},
        {
          maxWorkers: {
            value: cpus().length || 1,
            enumerable: false,
          },
        },
      ),
    ),
  ],
};

export default config;
