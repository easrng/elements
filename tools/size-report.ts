import {readdirSync, statSync, createReadStream} from 'node:fs';
import type stream from 'node:stream';
import {createGzip, createBrotliCompress} from 'node:zlib';
import Table from 'cli-table3';
import prettyBytes from 'pretty-bytes';

export default async function sizeReport() {
  const dist = new URL('../dist/', import.meta.url);
  const entries = readdirSync(dist);
  async function bytes(stream: stream.Readable) {
    return new Promise<number>((resolve, reject) => {
      let count = 0;
      stream.on('error', reject);
      stream.on('data', (chunk) => {
        count += chunk.length as number;
      });
      stream.on('end', () => resolve(count));
    });
  }

  const table = new Table({
    head: ['', 'Raw', 'GZip', 'Brotli'],
    chars: {
      'top-left': '╭',
      'top-right': '╮',
      'bottom-left': '╰',
      'bottom-right': '╯',
    },
  });

  const stats = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.endsWith('.js')) return [];
      const file = new URL(entry, dist);
      const {size: rawSize} = statSync(file);
      const gzipSize = await bytes(createReadStream(file).pipe(createGzip()));
      const brotliSize = await bytes(
        createReadStream(file).pipe(createBrotliCompress()),
      );
      return [
        [
          entry,
          ...[rawSize, gzipSize, brotliSize].map((n) =>
            prettyBytes(n, {
              maximumFractionDigits: 5,
            }),
          ),
        ],
      ];
    }),
  );

  table.push(...stats.flat(1));

  console.log(table.toString());
}
