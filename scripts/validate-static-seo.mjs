import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const siteRoot = join(repoRoot, 'site');
const distRoot = join(repoRoot, 'dist');
const baseUrl = 'https://luminia-lab.github.io/happy-earth-internet-archive/';
const content = JSON.parse(await readFile(join(siteRoot, 'assets/data/content.json'), 'utf8'));
const entriesBySlug = new Map(content.map((entry) => [entry.slug, entry]));
const failures = [];
const generatedIndexes = ['articles', 'news', 'events'];
const excludedSitemapRoutes = new Set(['404.html', 'backstage/', 'google6d54deb07ddc5b28.html']);

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

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

const normalizeRelativePath = (path) => path.split(sep).join('/');
const canonicalForRoute = (route) => `${baseUrl}${route}`;
const rootPrefix = (route) => '../'.repeat(route.split('/').filter(Boolean).length);
const canonicalMatches = (html) => [
  ...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi),
  ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/gi)
].map((match) => match[1]);
const hasNoindex = (html) => /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex\b[^"']*["'][^>]*>/i.test(html);
const stripCanonical = (html) => html.replace(/\s*<link\b[^>]*(?:\brel=["']canonical["']|\bhref=["'][^"']+["'][^>]*\brel=["']canonical["'])[^>]*>\s*/gi, '\n');

const routeFromHtmlPath = (relativePath) => {
  const normalized = normalizeRelativePath(relativePath);
  if (normalized === 'index.html') return '';
  if (!normalized.endsWith('/index.html')) return normalized;
  return normalized.slice(0, -'index.html'.length);
};

const localHtmlForUrl = (url) => {
  if (!url.startsWith(baseUrl)) return null;
  const route = url.slice(baseUrl.length);
  return route === '' ? join(distRoot, 'index.html') : join(distRoot, route, 'index.html');
};

try {
  const details = await stat(distRoot);
  if (!details.isDirectory()) failures.push('dist/ is not a directory');
} catch {
  failures.push('dist/ does not exist');
}

for (const entry of content) {
  const path = join(distRoot, entry.route, 'index.html');
  let html;
  try {
    html = await readFile(path, 'utf8');
  } catch {
    failures.push(`${entry.route}: generated HTML is missing`);
    continue;
  }
  const expectedCanonical = canonicalForRoute(entry.route);
  const title = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
  if (title.length !== 1 || title[0][1] !== `${escapeHtml(entry.title)}｜幸福地球`) {
    failures.push(`${entry.route}: title is missing or incorrect`);
  }
  if (title[0]?.[1] === '文章｜幸福地球') failures.push(`${entry.route}: generic title remains`);
  const descriptions = [...html.matchAll(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["'][^>]*>/gi)];
  if (descriptions.length !== 1 || descriptions[0][1] !== escapeHtml(entry.summary)) {
    failures.push(`${entry.route}: description is missing or incorrect`);
  }
  const canonicals = canonicalMatches(html);
  if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) {
    failures.push(`${entry.route}: expected one matching canonical`);
  }
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1s.length !== 1 || h1s[0][1] !== escapeHtml(entry.title)) {
    failures.push(`${entry.route}: expected one H1 matching the title`);
  }
  if (!html.includes(`<p class="article-summary">${escapeHtml(entry.summary)}</p>`)) {
    failures.push(`${entry.route}: summary is not present in article HTML`);
  }
  const firstText = entry.content.find((block) => block.type === 'list' ? block.items.length : block.text);
  const firstValue = firstText?.type === 'list' ? firstText.items[0] : firstText?.text;
  if (!firstValue || !html.includes(escapeHtml(firstValue))) failures.push(`${entry.route}: article body text is missing`);
  if (html.includes('文章載入中') || html.includes('內容載入中') || html.includes('活動載入中')) {
    failures.push(`${entry.route}: loading placeholder remains`);
  }
  if (/data-article-shell/.test(html)) failures.push(`${entry.route}: empty article shell remains`);
  if (/article-page\.js/.test(html)) failures.push(`${entry.route}: article-page.js is still loaded`);
  if (!/<div class="article-body">[\s\S]+<\/div>/.test(html)) failures.push(`${entry.route}: article body container is empty`);
  const root = rootPrefix(entry.route);
  for (const tag of entry.tags) {
    const href = `${root}topics/?tag=${encodeURIComponent(tag)}`;
    if (!html.includes(`href="${href}"`)) failures.push(`${entry.route}: tag link is missing for ${tag}`);
  }
  for (const slug of entry.relatedArticles) {
    const related = entriesBySlug.get(slug);
    if (!related) {
      failures.push(`${entry.route}: unknown related slug ${slug}`);
    } else if (!html.includes(`href="${root}${related.route}"`)) {
      failures.push(`${entry.route}: related link is missing for ${slug}`);
    }
  }
  const structured = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!structured) {
    failures.push(`${entry.route}: Article JSON-LD is missing`);
  } else {
    try {
      const data = JSON.parse(structured[1]);
      if (data['@type'] !== 'Article' || data.headline !== entry.title || data.mainEntityOfPage?.['@id'] !== expectedCanonical) {
        failures.push(`${entry.route}: Article JSON-LD does not match source data`);
      }
    } catch {
      failures.push(`${entry.route}: Article JSON-LD is invalid JSON`);
    }
  }
}

for (const section of generatedIndexes) {
  const sectionEntries = content.filter((entry) => entry.section === section);
  const html = await readFile(join(distRoot, section, 'index.html'), 'utf8');
  if (/載入中/.test(html)) failures.push(`${section}/: loading placeholder remains`);
  if ((html.match(/<h1\b/g) || []).length !== 1) failures.push(`${section}/: expected exactly one H1`);
  for (const entry of sectionEntries) {
    if (!html.includes(`href="../${entry.route}"`)) failures.push(`${section}/: missing static link to ${entry.route}`);
    if (!html.includes(escapeHtml(entry.title))) failures.push(`${section}/: missing title for ${entry.slug}`);
    if (!html.includes(escapeHtml(entry.summary))) failures.push(`${section}/: missing summary for ${entry.slug}`);
  }
}

let sitemapXml = '';
let sitemapText = '';
try {
  [sitemapXml, sitemapText] = await Promise.all([
    readFile(join(distRoot, 'sitemap.xml'), 'utf8'),
    readFile(join(distRoot, 'sitemap.txt'), 'utf8')
  ]);
} catch {
  failures.push('sitemap.xml or sitemap.txt is missing');
}

if (sitemapXml) {
  if (!sitemapXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) failures.push('sitemap.xml declaration is invalid');
  if (!/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">[\s\S]*<\/urlset>\s*$/.test(sitemapXml)) {
    failures.push('sitemap.xml root is invalid');
  }
  const urlBlocks = [...sitemapXml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?\s*<\/url>/g)]
    .map((match) => ({ url: match[1].replaceAll('&amp;', '&'), lastmod: match[2] || null }));
  const residual = sitemapXml
    .replace(/^<\?xml[^>]+>\s*/, '')
    .replace(/^<urlset[^>]+>\s*/, '')
    .replace(/<\/urlset>\s*$/, '')
    .replace(/<url>\s*<loc>[^<]+<\/loc>(?:\s*<lastmod>[^<]+<\/lastmod>)?\s*<\/url>/g, '')
    .trim();
  if (residual) failures.push('sitemap.xml contains unparseable content');
  const xmlUrls = urlBlocks.map((item) => item.url);
  const textUrls = sitemapText.trim().split(/\r?\n/).filter(Boolean);
  if (JSON.stringify(xmlUrls) !== JSON.stringify(textUrls)) failures.push('sitemap.txt and sitemap.xml URL order or set differs');
  if (new Set(xmlUrls).size !== xmlUrls.length) failures.push('sitemap contains duplicate URLs');
  const sorted = [...textUrls].sort((left, right) => left.localeCompare(right, 'en'));
  if (JSON.stringify(sorted) !== JSON.stringify(textUrls)) failures.push('sitemap.txt is not deterministically sorted');
  for (const item of urlBlocks) {
    if (!item.url.startsWith(baseUrl)) {
      failures.push(`sitemap URL is outside the canonical base: ${item.url}`);
      continue;
    }
    if (/[?#]/.test(item.url)) failures.push(`sitemap URL contains query or hash: ${item.url}`);
    const route = item.url.slice(baseUrl.length);
    if (excludedSitemapRoutes.has(route)) failures.push(`excluded route appears in sitemap: ${route}`);
    const localPath = localHtmlForUrl(item.url);
    try {
      const html = await readFile(localPath, 'utf8');
      if (hasNoindex(html)) failures.push(`noindex page appears in sitemap: ${route || '/'}`);
      const canonicals = canonicalMatches(html);
      if (canonicals.length !== 1 || canonicals[0] !== item.url) {
        failures.push(`sitemap canonical mismatch: ${route || '/'}`);
      }
    } catch {
      failures.push(`sitemap URL has no local HTML: ${item.url}`);
    }
    const entry = content.find((candidate) => candidate.route === route);
    if (entry && item.lastmod !== entry.updatedDate) failures.push(`${route}: sitemap lastmod does not match updatedDate`);
  }
}

const verificationName = 'google6d54deb07ddc5b28.html';
try {
  const [source, built] = await Promise.all([
    readFile(join(siteRoot, verificationName), 'utf8'),
    readFile(join(distRoot, verificationName), 'utf8')
  ]);
  if (source !== built || built.trim() !== 'google-site-verification: google6d54deb07ddc5b28.html') {
    failures.push('Google Search Console verification file changed');
  }
} catch {
  failures.push('Google Search Console verification file is missing');
}

const protectedSpecialPages = [
  'index.html',
  'archive/index.html',
  'backstage/index.html',
  'lucky/index.html',
  'origin/index.html',
  'summer/index.html',
  'topics/index.html',
  'travel/index.html',
  'vigor/index.html'
];
for (const relativePath of protectedSpecialPages) {
  const [source, built] = await Promise.all([
    readFile(join(siteRoot, relativePath), 'utf8'),
    readFile(join(distRoot, relativePath), 'utf8')
  ]);
  if (stripCanonical(source) !== stripCanonical(built)) failures.push(`${relativePath}: special page changed beyond canonical insertion`);
}

const vigor = await readFile(join(distRoot, 'vigor/index.html'), 'utf8');
if (!vigor.includes('<meta name="robots" content="index,follow,max-image-preview:large">') || hasNoindex(vigor)) {
  failures.push('vigor/: indexing status regressed');
}
if (!vigor.includes('id="ageGate"') || !vigor.includes('vigor-doctor-lin-yaosheng.webp')) {
  failures.push('vigor/: adult gate or Master Qiu image is missing');
}
const summer = await readFile(join(distRoot, 'summer/index.html'), 'utf8');
const home = await readFile(join(distRoot, 'index.html'), 'utf8');
if (!summer.includes('summer-teacher-official.webp') || !summer.includes('summer-teacher-authority.webp')) {
  failures.push('summer/: official teacher images are missing');
}
if (!home.includes('home-summer-ad') || !home.includes('summer-teacher-home-ad.webp')) {
  failures.push('/: Summer homepage AD is missing');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const sitemapCount = sitemapText.trim().split(/\r?\n/).filter(Boolean).length;
console.log(`PASS static SEO entries=${content.length} indexes=${generatedIndexes.length} sitemapURLs=${sitemapCount}`);
console.log('PASS titles, descriptions, canonicals, H1, body, tags, related links, and Article JSON-LD');
console.log('PASS sitemap.xml parses; sitemap.txt matches, is sorted, and excludes noindex/private routes');
console.log('PASS protected special pages, Vigor indexing, Summer AD, and Google verification are preserved');
console.log('PASS generated articles are fully readable without article-page.js');
