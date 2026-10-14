// Copies pinned, independently licensed decoder packages into the static site at build time.
// Browsers then load these assets from our own GitHub Pages origin, not a third-party CDN.
import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const vendor = join(root, 'site/assets/vendor');
const files = [
  ['node_modules/zxing-wasm/dist/iife/reader/index.js', 'zxing/reader.js'],
  ['node_modules/zxing-wasm/dist/reader/zxing_reader.wasm', 'zxing/zxing_reader.wasm'],
  ['node_modules/bcbp/dist/index.umd.js', 'bcbp/bcbp.js']
];
for (const [source, dest] of files) {
  const src = join(root, source);
  const destination = join(vendor, dest);
  const info = await stat(src);
  if (!info.size) throw new Error('Decoder dependency unexpectedly empty: ' + source);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await cp(src, destination);
  console.log('Prepared ' + dest + ' (' + info.size + ' bytes)');
}
const manifest = {
  'zxing-wasm': '3.1.5',
  'bcbp': '6.0.2',
  description: 'Third-party libraries are fetched only during GitHub Actions build; browser-side barcode images are never uploaded.',
  attribution: {
    'zxing-wasm': 'MIT; embedded zxing-cpp: Apache-2.0',
    'bcbp': 'MIT'
  }
};
await (await import('node:fs/promises')).writeFile(join(vendor, 'versions.json'), JSON.stringify(manifest, null, 2) + '\n');
