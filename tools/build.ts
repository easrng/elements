import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {cpus} from 'node:os';
import {resolve, dirname} from 'node:path';
import {
  type Plugin,
  rollup,
  watch,
  type RollupWatcherEvent,
  type ResolveIdHook,
  type RollupOptions,
} from 'rollup';
import replace from '@rollup/plugin-replace';
import {createServer} from 'ixie';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import {$} from 'zx';
import pLimit from 'p-limit';
import sizeReport from './size-report.js';

const development = process.argv.includes('--dev');
const dist = new URL('../dist/', import.meta.url);
const readmeCode = new URL('../readme_code/', import.meta.url);
const limit = pLimit(1);
const fixTypes = async () =>
  limit(
    async () => $`
      cd ${fileURLToPath(new URL('../', import.meta.url))} &&
      [ -x dist/src/ ] &&
      # for deno
      find dist/src/ -type f -name '*.d.ts' -exec sed -i 's/\\.js'\\''/.d.ts'\\''/g' {} \\; &&
      rm -rf dist/minify dist/typescript dist/shared &&
      mv dist/src/* dist/ &&
      rmdir dist/src &&
      echo '{"type":"commonjs"}' >dist/typescript/package.json &&
      mv dist/typescript.tmp.js dist/typescript/index.js &&
      mv dist/typescript.tmp.js.map dist/typescript/index.js.map &&
      cp src/typescript/index.d.cts dist/typescript/index.d.ts ||
      true
    `,
  );

const input = [
  './src/core.ts',
  './src/debug.ts',
  './src/server.ts',
  './src/elements.ts',
  './src/minify.ts',
].map((path) => resolve(path));

const terserInstance = terser(
  Object.defineProperties(
    {},
    {
      maxWorkers: {
        value: cpus().length || 1,
        enumerable: false,
      },
    },
  ),
);
const ts = typescript({
  emitDeclarationOnly: true,
  declaration: true,
  declarationDir: 'dist',
  include: [
    ...input,
    './src/tiny.ts',
    './src/minify/core.ts',
    './src/minify/plugin.ts',
    './src/typescript/plugin.ts',
    './src/typescript/parse.ts',
    './src/shared/cook.ts',
  ],
});
const jsToTs: Plugin = {
  name: 'jsToTs',
  resolveId(source, importer, options) {
    const path = importer
      ? resolve(dirname(importer), source)
      : resolve(source);
    const tsified = path.slice(0, -2) + 'ts';
    if (!existsSync(path) && existsSync(tsified)) {
      return ((ts as any).resolveId as ResolveIdHook)(
        tsified,
        importer,
        options,
      );
    }

    return undefined;
  },
};
const options = {
  input,
  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    jsToTs,
    ts,
    terserInstance,
    replace({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      TINY: 'false',
      preventAssignment: false,
    }),
  ],
  external: ['@preact/signals-core', 'magic-string', 'js-tokens'],
} as const satisfies RollupOptions;
const tinyOptions = {
  input: './src/tiny.ts',
  output: options.output,
  plugins: [
    jsToTs,
    {
      name: 'replace',
      resolveId(source, _importer, _options) {
        if (source === '@preact/signals-core') {
          return {
            id: resolve('./src/signals-stub.js'),
          };
        }

        return undefined;
      },
    },
    ts,
    terserInstance,
    replace({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      TINY: 'true',
      preventAssignment: false,
    }),
  ],
} as const satisfies RollupOptions;
const tsPluginOptions = {
  input: [resolve('./src/typescript/plugin.ts')],
  output: {
    file: './dist/typescript.tmp.js',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [jsToTs, ts, terserInstance],
  external: ['typescript-template-language-service-decorator'],
} as const satisfies RollupOptions;

rmSync(dist, {
  force: true,
  recursive: true,
});
mkdirSync(dist);
rmSync(readmeCode, {
  force: true,
  recursive: true,
});
mkdirSync(readmeCode);

for (const [i, [, type, code]] of Array.from(
  readFileSync(new URL('../README.md', import.meta.url))
    .toString('utf8')
    .matchAll(/^```(.+)\n([\s\S]+?)^```$/gm),
).entries()) {
  writeFileSync(new URL(i + '.' + type!, readmeCode), code!);
}

// Work around faulty module detection code
writeFileSync(new URL('minify.mjs', dist), 'export{default}from"./minify.js"');

if (development) {
  process.env['NODE_ENV'] = 'development';
  const watcher1 = watch(options);
  const watcher2 = watch(tinyOptions);
  const watcher3 = watch(tsPluginOptions);
  let ends = 0;
  let builtResolve: () => void;
  const builtPromise = new Promise<void>((resolve) => {
    builtResolve = resolve;
  });
  const handler = async (event: RollupWatcherEvent) => {
    switch (event.code) {
      case 'START': {
        break;
      }

      case 'BUNDLE_END': {
        console.log('bundled', event.input, '→', event.output);
        await event.result.write(options.output);
        await fixTypes();
        if (ends < 3) {
          ends++;
        }

        if (ends === 3) {
          builtResolve();
        }

        break;
      }

      case 'BUNDLE_START': {
        console.log('bundling', event.input, '→', event.output);
        break;
      }

      case 'END': {
        break;
      }

      case 'ERROR': {
        console.error(event.error);
        if (event.result) {
          await event.result.write(options.output);
        }

        break;
      }
    }
  };

  watcher1.on('event', handler);
  watcher2.on('event', handler);
  watcher3.on('event', handler);
  await builtPromise;
  const addresses = await createServer({
    sourceDir: fileURLToPath(new URL('test/', import.meta.url)),
  });
  console.log('Listening on', addresses.url);
} else {
  const bundle = await rollup(options);
  await bundle.write(options.output);
  const bundleTiny = await rollup(tinyOptions);
  await bundleTiny.write(tinyOptions.output);
  const bundleTypescript = await rollup(tsPluginOptions);
  await bundleTypescript.write(tsPluginOptions.output);
  await fixTypes();
  await sizeReport();
}
