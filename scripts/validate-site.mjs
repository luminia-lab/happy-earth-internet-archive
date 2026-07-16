import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const siteRoot = join(repoRoot, 'site');
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path));
    else output.push(path);
  }
  return output;
}

const internal = JSON.parse(await readFile(join(repoRoot, 'content/articles-metadata.json'), 'utf8'));
const publicContent = JSON.parse(await readFile(join(siteRoot, 'assets/data/content.json'), 'utf8'));
const required = ['slug', 'title', 'category', 'summary', 'publishedDate', 'updatedDate', 'author', 'heroImage', 'tags', 'contentType', 'canonicalStatus', 'relatedArticles', 'sourceNote', 'characterLinks', 'timelineNote'];
const contentTypes = new Set(['useful', 'clickbait-but-mostly-true', 'mixed', 'sponsored', 'misinformation', 'event', 'narrative-evidence']);
const statuses = new Set(['canon', 'working', 'pending']);
const privateFields = ['canonicalStatus', 'sourceNote', 'characterLinks', 'timelineNote'];
const fillerSlugs = [
  'relationship-fades-signs',
  'silent-people-understand-most',
  'home-is-a-feeling',
  'after-thirty-realizations',
  'family-needs-communication',
  'letting-go-is-growing-up',
  'details-show-love',
  'quality-life-small-habits',
  'tired-because-sensible',
  'breakfast-personality',
  'love-does-not-make-you-guess',
  'declutter-your-life',
  'simple-happiness'
];

const duplicateValues = (items, key) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    const value = item[key];
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

for (const slug of duplicateValues(internal, 'slug')) failures.push(`duplicate internal slug: ${slug}`);
for (const route of duplicateValues(internal, 'route')) failures.push(`duplicate internal route: ${route}`);
for (const slug of duplicateValues(publicContent, 'slug')) failures.push(`duplicate public slug: ${slug}`);
for (const route of duplicateValues(publicContent, 'route')) failures.push(`duplicate public route: ${route}`);

for (const entry of internal) {
  for (const key of required) if (!(key in entry)) failures.push(`metadata missing ${key}: ${entry.slug || '(unknown)'}`);
  if (!contentTypes.has(entry.contentType)) failures.push(`invalid contentType: ${entry.slug}`);
  if (!statuses.has(entry.canonicalStatus)) failures.push(`invalid canonicalStatus: ${entry.slug}`);
  const routeIndex = join(siteRoot, entry.route, 'index.html');
  try { await stat(routeIndex); } catch { failures.push(`missing route file: ${entry.route}`); }
}

for (const entry of publicContent) {
  for (const key of privateFields) if (key in entry) failures.push(`private field exposed in public data: ${key} on ${entry.slug}`);
}

const fillerEntries = fillerSlugs.map((slug) => publicContent.find((entry) => entry.slug === slug));
for (const [index, entry] of fillerEntries.entries()) {
  if (!entry) failures.push(`missing filler article: ${fillerSlugs[index]}`);
  else if (!Array.isArray(entry.content) || !entry.content.length) failures.push(`missing filler content: ${entry.slug}`);
}
const availableFillerEntries = fillerEntries.filter(Boolean);
const fullSequences = new Map();
const majorBlocks = new Map();
for (const entry of availableFillerEntries) {
  const fullSequence = JSON.stringify(entry.content);
  if (fullSequences.has(fullSequence)) failures.push(`identical filler content: ${fullSequences.get(fullSequence)} and ${entry.slug}`);
  fullSequences.set(fullSequence, entry.slug);
  if (entry.content.some((block) => block.text === '很多人直到現在才發現')) failures.push(`repeated filler heading remains: ${entry.slug}`);
  for (const block of entry.content.filter((item) => item.type !== 'note')) {
    const serialized = JSON.stringify(block);
    if (majorBlocks.has(serialized)) failures.push(`shared filler body block: ${majorBlocks.get(serialized)} and ${entry.slug}`);
    majorBlocks.set(serialized, entry.slug);
  }
}

const articlePageSource = await readFile(join(siteRoot, 'assets/js/article-page.js'), 'utf8');
if (/fillerOverrides|if\s*\([^)]*slug[^)]*\)\s*article\.content\s*=/.test(articlePageSource)) failures.push('article-page.js still contains a slug content override');
if (!articlePageSource.includes('article.content.forEach')) failures.push('article-page.js does not render content.json article content directly');
if (!/textElement\(['"]a['"]/.test(articlePageSource) || !articlePageSource.includes('topics/?tag=${encodeURIComponent(tag)}')) failures.push('article tags are not encoded links');

const topicsSource = await readFile(join(siteRoot, 'assets/js/topics.js'), 'utf8');
const topicsHtml = await readFile(join(siteRoot, 'topics/index.html'), 'utf8');
if (!topicsSource.includes("params.get('tag')") || !topicsSource.includes('item.tags.includes(tag)')) failures.push('topics tag filtering is missing');
if (!topicsHtml.includes('data-topic-clear') || !topicsSource.includes('clear.hidden = !tag')) failures.push('topics clear-tag control is missing');

const files = await walk(siteRoot);
const publicFiles = files.filter((file) => !relative(siteRoot, file).startsWith('backstage/'));
const banned = ['此處替換圖片', '之後請換成', '讀者考古提示', '共用人物照片位置', '製作備註', '素材檔名', '給施工者看的說明', '之後請替換', '此處替換為', '推薦名單尚未定稿', '文章骨架', '等待正式資料', '目前僅建立資料結構', '預留文章鏈', '影像整理中', '等待正式公布', '推薦名單整理中'];

for (const file of publicFiles) {
  if (!/\.(html|css|js|svg|json|md)$/.test(file)) continue;
  const source = await readFile(file, 'utf8');
  for (const phrase of banned) if (source.includes(phrase)) failures.push(`public construction note "${phrase}": ${relative(siteRoot, file)}`);
  if (/localStorage|sessionStorage|sendBeacon|XMLHttpRequest/.test(source)) failures.push(`unexpected persistence or transport API: ${relative(siteRoot, file)}`);
  if (/<form\b[^>]*\baction=/i.test(source)) failures.push(`form action found: ${relative(siteRoot, file)}`);
}

const htmlFiles = files.filter((file) => file.endsWith('.html'));
for (const file of htmlFiles) {
  const source = await readFile(file, 'utf8');
  if (!source.includes('assets/js/common.js')) failures.push(`shared navigation script missing: ${relative(siteRoot, file)}`);
  const refs = [...source.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|mailto:|tel:|#|data:|javascript:)/.test(ref)) continue;
    const withoutQuery = ref.split(/[?#]/)[0];
    if (!withoutQuery) continue;
    let target = normalize(join(dirname(file), withoutQuery));
    if (withoutQuery.endsWith('/')) target = join(target, 'index.html');
    try { await stat(target); } catch { failures.push(`broken local reference ${ref}: ${relative(siteRoot, file)}`); }
  }
}

for (const file of files) {
  const name = relative(siteRoot, file);
  if (/(?:^|\/)(?:.*-)?(?:placeholder|staging|payload|temporary)(?:[.-]|$)/i.test(name)) failures.push(`construction file remains in public site: ${name}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`PASS metadata=${internal.length} publicEntries=${publicContent.length} htmlRoutes=${htmlFiles.length} checkedFiles=${files.length}`);
console.log(`PASS unique slugs/routes; ${availableFillerEntries.length} filler articles have distinct content.json bodies`);
console.log('PASS article-page.js renders content.json directly; Topics links, filtering, and clear action are present');
console.log('PASS no public governance fields, construction notes, persistent storage, transport APIs, or form actions');
console.log('PASS all static href/src targets resolve inside site/');
