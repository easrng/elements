import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import {type RollupOptions} from 'rollup';

const input = ['src/index.ts', 'src/debug.ts'];

const config: RollupOptions = {
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
    terser(),
  ],
};

export default config;
