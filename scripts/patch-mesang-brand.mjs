import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../dist/', import.meta.url);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const replacements = [
  ['幸福地球數位內容有限公司', '幸福地球文化內容有限公司'],
  ['Happy Earth Digital Content Co., Ltd.', 'Mesang Entertainment Co., Ltd.'],
  ['Happy Earth Content Operations', 'MESANG Content Operations'],
  ['幸福地球｜由幸福地球文化內容有限公司營運。', '幸福地球｜MESANG｜由幸福地球文化內容有限公司營運。｜Mesang Entertainment Co., Ltd.']
];

const files = (await walk(root)).filter((path) => path.endsWith('.html'));
let changed = 0;
for (const file of files) {
  const source = await readFile(file, 'utf8');
  let updated = source;
  for (const [from, to] of replacements) updated = updated.replaceAll(from, to);
  if (updated !== source) {
    await writeFile(file, updated);
    changed += 1;
  }
}

console.log(`MESANG brand patch updated ${changed} HTML files`);
