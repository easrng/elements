import {rmSync} from 'node:fs';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {rollup, watch, type RollupWatcherEvent} from 'rollup';
import {createServer} from 'vite';
import sizeReport from './size-report.ts';
import options from './rollup.config.ts';

const dev = process.argv.includes('--dev');
const dist = new URL('../dist/', import.meta.url);
function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}

rmSync(dist, {
  force: true,
  recursive: true,
});
if (dev) {
  process.env['NODE_ENV'] = 'development';
  const watcher = watch(options);
  watcher.on('event', async (event: RollupWatcherEvent) => {
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

      default: {
        assertUnreachable(event);
      }
    }
  });
  const server = await createServer({
    root: fileURLToPath(new URL('test/', import.meta.url)),
  });
  await server.listen();
  server.printUrls();
} else {
  const bundle = await rollup(options);
  await bundle.write(options.output);
  await sizeReport();
}
