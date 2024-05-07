/* eslint-disable unicorn/prefer-top-level-await */
import {promisify} from 'node:util';
import process from 'node:process';
import {readFileSync} from 'node:fs';
import webpack from 'webpack';
import {createFsFromVolume, Volume} from 'memfs';
import {rollup} from 'rollup';
import elementsMinify from '@easrng/elements/minify';
import {rspack, type Configuration as rspackConfiguration} from '@rspack/core';
import {rolldown, type Plugin} from 'rolldown';
import esbuild from 'rollup-plugin-esbuild';

async function testWebpack() {
  const fs = createFsFromVolume(new Volume());
  const webpackConfig: webpack.Configuration = {
    entry: './tools/test/main.ts',
    output: {
      filename: './bundle.js',
      library: {
        type: 'module',
      },
    },
    experiments: {
      outputModule: true,
    },
    mode: 'production',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            '@easrng/elements/minify',
            {
              loader: 'esbuild-loader',
              options: {
                target: 'esnext',
              },
            },
          ],
          type: 'javascript/esm',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    externals: /^@/,
    optimization: {
      minimize: false,
    },
  };
  const compiler = webpack(webpackConfig);
  compiler.outputFileSystem = fs as typeof compiler.outputFileSystem;
  const stats = (await promisify(compiler.run.bind(compiler))())!;
  if (stats.hasErrors()) {
    console.error(stats.toString());
    return ['webpack', ''] as const;
  }

  return [
    'webpack',
    fs.readFileSync('./dist/bundle.js').toString('utf8'),
  ] as const;
}

async function testRollup() {
  const result = await rollup({
    input: './tools/test/main.ts',
    plugins: [
      esbuild({
        target: 'esnext',
      }),
      elementsMinify(),
    ],
    external: /^@/,
  });
  const generated = await result.generate({
    format: 'es',
  });
  return ['rollup', generated.output[0].code] as const;
}

async function testRspack() {
  const fs = createFsFromVolume(new Volume());
  const rspackConfig: rspackConfiguration = {
    entry: './tools/test/main.ts',
    output: {
      filename: './bundle.js',
      library: {
        type: 'module',
      },
    },
    experiments: {
      outputModule: true,
    },
    mode: 'production',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            '@easrng/elements/minify',
            {
              loader: 'esbuild-loader',
              options: {
                target: 'esnext',
              },
            },
          ],
          type: 'javascript/esm',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    externals: /^@/,
    optimization: {
      minimize: false,
    },
  };
  const compiler = rspack(rspackConfig);
  compiler.outputFileSystem = fs as unknown as typeof compiler.outputFileSystem;
  const stats = (await promisify(compiler.run.bind(compiler))())!;
  if (stats.hasErrors()) {
    console.error(stats.toString());
    return ['rspack', ''] as const;
  }

  return [
    'rspack',
    fs.readFileSync('./dist/bundle.js').toString('utf8'),
  ] as const;
}

async function testRolldown() {
  const result = await rolldown({
    platform: 'node',
    input: './tools/test/main.ts',
    plugins: [
      esbuild({
        target: 'esnext',
      }) as Plugin,
      elementsMinify(),
    ],
    external: /^@/,
  });
  const generated = await result.generate({
    format: 'es',
  });
  return ['rolldown', generated.output[0].code] as const;
}

if (readFileSync('./tools/test/main.ts').includes('checked/>')) {
  throw new Error('exiting early, false positives.');
}

const tests = [testWebpack(), testRollup(), testRspack(), testRolldown()];
await Promise.all(
  tests.map(async (p) =>
    p.then(async (result) =>
      result[1].includes('checked/>')
        ? console.log(result[0] + ': all good')
        : console.error(result[0] + ': not minified'),
    ),
  ),
);
// eslint-disable-next-line unicorn/no-process-exit
process.exit(0);
