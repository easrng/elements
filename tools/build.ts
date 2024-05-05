import {rmSync} from 'node:fs';
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
import {createServer} from 'vite';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import sizeReport from './size-report.js';

const development = process.argv.includes('--dev');
const dist = new URL('../dist/', import.meta.url);

const input = [
  'src/core.ts',
  'src/debug.ts',
  'src/server.ts',
  'src/elements.ts',
  'src/minify.ts',
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
  include: [...input, 'src/tiny.ts'],
});
const jsToTs: Plugin = {
  name: 'jsToTs',
  resolveId(source, importer, options) {
    const path = importer
      ? resolve(dirname(importer), source)
      : resolve(source);
    const tsified = path.slice(0, -2) + 'ts';
    if (path !== tsified && input.includes(tsified)) {
      return ((ts as any).resolveId as ResolveIdHook)(path, importer, options);
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
  external: '@preact/signals-core',
} as const satisfies RollupOptions;
const tinyOptions = {
  input: 'src/tiny.ts',
  output: options.output,
  plugins: [
    jsToTs,
    {
      name: 'replace',
      resolveId(source, _importer, _options) {
        if (source === '@preact/signals-core') {
          return {
            id: resolve('src/signals-stub.js'),
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

rmSync(dist, {
  force: true,
  recursive: true,
});
if (development) {
  process.env['NODE_ENV'] = 'development';
  const watcher1 = watch(options);
  const watcher2 = watch(tinyOptions);
  const handler = async (event: RollupWatcherEvent) => {
    switch (event.code) {
      case 'START': {
        break;
      }

      case 'BUNDLE_END': {
        console.log('bundled', event.input, '→', event.output);
        await event.result.write(options.output);
        break;
      }

      case 'BUNDLE_START': {
        console.log('bundling', event.input, '→', event.output);
        break;
      }

      case 'END': {
        await sizeReport();
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
  const server = await createServer({
    root: fileURLToPath(new URL('test/', import.meta.url)),
  });
  await server.listen();
  server.printUrls();
} else {
  const bundle = await rollup(options);
  await bundle.write(options.output);
  const bundleTiny = await rollup(tinyOptions);
  await bundleTiny.write(options.output);
  await sizeReport();
}
