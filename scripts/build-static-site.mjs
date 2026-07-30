import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const siteRoot = join(repoRoot, 'site');
const distRoot = join(repoRoot, 'dist');
const contentPath = join(siteRoot, 'assets/data/content.json');
const baseUrl = 'https://luminia-lab.github.io/happy-earth-internet-archive/';
const generatedIndexSections = new Set(['articles', 'news', 'events']);
const excludedHtml = new Set([
  '404.html',
  'backstage/index.html',
  'google6d54deb07ddc5b28.html'
]);
const supportedBlockTypes = new Set(['paragraph', 'heading', 'list', 'note']);

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const escapeXml = (value) => escapeHtml(value);

const jsonForHtml = (value) => JSON.stringify(value, null, 2)
  .replaceAll('<', '\\u003c')
  .replaceAll('\u2028', '\\u2028')
  .replaceAll('\u2029', '\\u2029');

const routeDepth = (route) => route.split('/').filter(Boolean).length;
const rootPrefix = (route) => '../'.repeat(routeDepth(route));

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

const routeFromHtmlPath = (relativePath) => {
  const normalized = normalizeRelativePath(relativePath);
  if (normalized === 'index.html') return '';
  if (!normalized.endsWith('/index.html')) return null;
  return normalized.slice(0, -'index.html'.length);
};

const canonicalForRoute = (route) => `${baseUrl}${route}`;

const getCanonicalLinks = (html) => [
  ...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi),
  ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/gi)
].map((match) => match[1]);

const hasNoindex = (html) => /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex\b[^"']*["'][^>]*>/i.test(html);

function ensureCanonical(html, canonical, relativePath) {
  const existing = getCanonicalLinks(html);
  if (existing.length > 1) throw new Error(`${relativePath}: multiple canonical links`);
  if (existing.length === 1) {
    if (existing[0] !== canonical) {
      throw new Error(`${relativePath}: canonical ${existing[0]} does not match ${canonical}`);
    }
    return html;
  }
  if (!html.includes('</head>')) throw new Error(`${relativePath}: cannot insert canonical without </head>`);
  return html.replace('</head>', `  <link rel="canonical" href="${escapeHtml(canonical)}">\n</head>`);
}

function validateEntry(entry, slugs, routes) {
  const required = [
    'slug', 'route', 'section', 'title', 'category', 'summary',
    'publishedDate', 'updatedDate', 'author', 'heroImage', 'tags',
    'contentType', 'relatedArticles', 'content'
  ];
  for (const key of required) {
    if (!(key in entry)) throw new Error(`${entry.slug || '(unknown)'}: missing ${key}`);
  }
  if (!generatedIndexSections.has(entry.section)) throw new Error(`${entry.slug}: unsupported section ${entry.section}`);
  if (!entry.route.endsWith('/')) throw new Error(`${entry.slug}: route must end with /`);
  if (slugs.has(entry.slug)) throw new Error(`${entry.slug}: duplicate slug`);
  if (routes.has(entry.route)) throw new Error(`${entry.slug}: duplicate route ${entry.route}`);
  slugs.add(entry.slug);
  routes.add(entry.route);
  if (!Array.isArray(entry.tags) || !Array.isArray(entry.relatedArticles) || !Array.isArray(entry.content)) {
    throw new Error(`${entry.slug}: tags, relatedArticles and content must be arrays`);
  }
  for (const block of entry.content) {
    if (!supportedBlockTypes.has(block.type)) {
      throw new Error(`${entry.slug}: unsupported content block type ${block.type}`);
    }
    if (block.type === 'list') {
      if (!Array.isArray(block.items)) throw new Error(`${entry.slug}: list block is missing items`);
    } else if (typeof block.text !== 'string') {
      throw new Error(`${entry.slug}: ${block.type} block is missing text`);
    }
  }
}

async function resolveHero(entry) {
  if (entry.heroImage === null || entry.heroImage === '') return null;
  if (typeof entry.heroImage !== 'string') throw new Error(`${entry.slug}: heroImage must be a string or null`);
  if (/^(?:https?:|data:|javascript:)/i.test(entry.heroImage)) {
    throw new Error(`${entry.slug}: heroImage must be a local site asset`);
  }
  const relativePath = entry.heroImage.replace(/^\/+/, '');
  const absolutePath = resolve(siteRoot, relativePath);
  if (!absolutePath.startsWith(`${siteRoot}${sep}`)) throw new Error(`${entry.slug}: heroImage escapes site/`);
  try {
    const details = await stat(absolutePath);
    if (!details.isFile()) throw new Error('not a file');
  } catch {
    throw new Error(`${entry.slug}: missing heroImage ${relativePath}`);
  }
  return relativePath;
}

function renderBodyBlock(entry, block) {
  if (block.type === 'paragraph') return `        <p>${escapeHtml(block.text)}</p>`;
  if (block.type === 'heading') return `        <h2>${escapeHtml(block.text)}</h2>`;
  if (block.type === 'note') return `        <div class="article-note">${escapeHtml(block.text)}</div>`;
  if (block.type === 'list') {
    const items = block.items.map((item) => `          <li>${escapeHtml(item)}</li>`).join('\n');
    return `        <ul>\n${items}\n        </ul>`;
  }
  throw new Error(`${entry.slug}: unsupported content block type ${block.type}`);
}

async function renderArticle(entry, entriesBySlug) {
  const root = rootPrefix(entry.route);
  const canonical = canonicalForRoute(entry.route);
  const heroPath = await resolveHero(entry);
  const sectionLabel = entry.section === 'events' ? '活動' : entry.section === 'news' ? '社會' : '文章';
  const body = entry.content.map((block) => renderBodyBlock(entry, block)).join('\n');
  const tags = entry.tags.map((tag) => (
    `        <a href="${root}topics/?tag=${encodeURIComponent(tag)}" aria-label="查看標籤 ${escapeHtml(tag)} 的內容"># ${escapeHtml(tag)}</a>`
  )).join('\n');
  const relatedItems = entry.relatedArticles.map((slug) => {
    const related = entriesBySlug.get(slug);
    if (!related) throw new Error(`${entry.slug}: related article ${slug} does not exist`);
    return related;
  });
  const related = relatedItems.length ? `
    <aside class="article-related">
      <h2>你可能也會喜歡</h2>
${relatedItems.map((item) => `      <p><a href="${root}${escapeHtml(item.route)}">${escapeHtml(item.title)}</a></p>`).join('\n')}
    </aside>` : '';
  const hero = heroPath ? `
    <figure class="article-hero">
      <img src="${root}${escapeHtml(heroPath)}" alt="${escapeHtml(`${entry.title}主圖`)}">
    </figure>` : '';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: entry.title,
    description: entry.summary,
    datePublished: entry.publishedDate,
    dateModified: entry.updatedDate,
    author: {
      '@type': 'Organization',
      name: entry.author
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical
    }
  };
  if (heroPath) structuredData.image = canonicalForRoute(heroPath);
  const heroOpenGraph = heroPath
    ? `\n  <meta property="og:image" content="${escapeHtml(canonicalForRoute(heroPath))}">\n  <meta property="og:image:alt" content="${escapeHtml(`${entry.title}主圖`)}">`
    : '';

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(entry.title)}｜幸福地球</title>
  <meta name="description" content="${escapeHtml(entry.summary)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="zh_TW">
  <meta property="og:site_name" content="幸福地球">
  <meta property="og:title" content="${escapeHtml(entry.title)}">
  <meta property="og:description" content="${escapeHtml(entry.summary)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">${heroOpenGraph}
  <script type="application/ld+json">
${jsonForHtml(structuredData)}
  </script>
  <link rel="stylesheet" href="${root}assets/css/common.css">
  <link rel="stylesheet" href="${root}assets/css/articles.css">
</head>
<body>
<header class="site-header"><div class="header-inner"><a class="brand" href="${root}"><span class="brand-mark">🌍</span><span>幸福地球</span></a><nav class="nav" aria-label="主選單"><a href="${root}articles/">文章</a><a href="${root}events/">活動</a><a href="${root}news/">社會</a><a href="${root}travel/">旅遊活動</a></nav></div></header>
<main class="article-main">
  <nav class="article-breadcrumb" aria-label="麵包屑"><a href="${root}">幸福地球</a> ／ <a href="${root}${entry.section}/">${sectionLabel}</a></nav>
  <span class="badge">${escapeHtml(entry.category)}</span>
  <h1>${escapeHtml(entry.title)}</h1>
  <p class="article-summary">${escapeHtml(entry.summary)}</p>
  <p class="article-meta">發布：<time datetime="${escapeHtml(entry.publishedDate)}">${escapeHtml(entry.publishedDate)}</time>　更新：<time datetime="${escapeHtml(entry.updatedDate)}">${escapeHtml(entry.updatedDate)}</time>　作者：${escapeHtml(entry.author)}</p>${hero}
  <div class="article-body">
${body}
  </div>
  <div class="article-tags">
${tags}
  </div>${related}
</main>
<footer class="footer"><div class="container">幸福地球｜由幸福地球數位內容有限公司營運。</div></footer>
<script src="${root}assets/js/common.js"></script>
</body>
</html>
`;
}

function renderIndexCard(entry) {
  return `        <article class="card content-card" data-category="${escapeHtml(entry.category)}" data-tags="${escapeHtml(JSON.stringify(entry.tags))}">
          <div class="card-body">
            <span class="badge">${escapeHtml(entry.category)}</span>
            <h2>${escapeHtml(entry.title)}</h2>
            <p>${escapeHtml(entry.summary)}</p>
            <p class="article-index-meta">更新：<time datetime="${escapeHtml(entry.updatedDate)}">${escapeHtml(entry.updatedDate)}</time></p>
            <a href="../${escapeHtml(entry.route)}">閱讀內容 →</a>
          </div>
        </article>`;
}

async function generateIndex(section, entries) {
  const path = join(distRoot, section, 'index.html');
  const source = await readFile(path, 'utf8');
  const cards = entries.filter((entry) => entry.section === section).map(renderIndexCard).join('\n');
  const hostPattern = /<div class="content-grid" data-content-index\b[^>]*>[\s\S]*?<\/div>/;
  if (!hostPattern.test(source)) throw new Error(`${section}/index.html: content index host not found`);
  const replacement = `<div class="content-grid" data-content-index data-section="${section}" data-root="../">\n${cards}\n      </div>`;
  await writeFile(path, source.replace(hostPattern, replacement));
}

async function addStaticCanonicals() {
  const htmlFiles = (await walk(distRoot)).filter((path) => path.endsWith('.html'));
  for (const path of htmlFiles) {
    const relativePath = normalizeRelativePath(relative(distRoot, path));
    if (excludedHtml.has(relativePath)) continue;
    const route = routeFromHtmlPath(relativePath);
    if (route === null) continue;
    const source = await readFile(path, 'utf8');
    if (hasNoindex(source)) continue;
    const updated = ensureCanonical(source, canonicalForRoute(route), relativePath);
    if (updated !== source) await writeFile(path, updated);
  }
}

async function generateSitemaps(entries) {
  const updatedDates = new Map(entries.map((entry) => [entry.route, entry.updatedDate]));
  const htmlFiles = (await walk(distRoot)).filter((path) => path.endsWith('.html'));
  const pages = [];
  for (const path of htmlFiles) {
    const relativePath = normalizeRelativePath(relative(distRoot, path));
    if (excludedHtml.has(relativePath)) continue;
    const route = routeFromHtmlPath(relativePath);
    if (route === null) continue;
    const html = await readFile(path, 'utf8');
    if (hasNoindex(html)) continue;
    const canonicals = getCanonicalLinks(html);
    if (canonicals.length !== 1) throw new Error(`${relativePath}: expected one canonical before sitemap generation`);
    const expected = canonicalForRoute(route);
    if (canonicals[0] !== expected) throw new Error(`${relativePath}: canonical does not match its route`);
    pages.push({ route, url: expected, lastmod: updatedDates.get(route) || null });
  }
  pages.sort((left, right) => left.url.localeCompare(right.url, 'en'));
  const duplicates = pages.filter((page, index) => index > 0 && page.url === pages[index - 1].url);
  if (duplicates.length) throw new Error(`duplicate sitemap URL: ${duplicates[0].url}`);
  const xmlEntries = pages.map((page) => {
    const lastmod = page.lastmod ? `\n    <lastmod>${escapeXml(page.lastmod)}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeXml(page.url)}</loc>${lastmod}\n  </url>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>\n`;
  const text = `${pages.map((page) => page.url).join('\n')}\n`;
  await writeFile(join(distRoot, 'sitemap.xml'), xml);
  await writeFile(join(distRoot, 'sitemap.txt'), text);
  return pages.length;
}

async function main() {
  const entries = JSON.parse(await readFile(contentPath, 'utf8'));
  if (!Array.isArray(entries)) throw new Error('content.json must contain an array');
  const slugs = new Set();
  const routes = new Set();
  entries.forEach((entry) => validateEntry(entry, slugs, routes));
  const entriesBySlug = new Map(entries.map((entry) => [entry.slug, entry]));

  await rm(distRoot, { recursive: true, force: true });
  await mkdir(distRoot, { recursive: true });
  await cp(siteRoot, distRoot, { recursive: true });

  for (const entry of entries) {
    const output = join(distRoot, entry.route, 'index.html');
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, await renderArticle(entry, entriesBySlug));
  }
  for (const section of generatedIndexSections) await generateIndex(section, entries);
  await addStaticCanonicals();
  const sitemapCount = await generateSitemaps(entries);

  console.log(`BUILD dist/ copied from site/ and prerendered ${entries.length} content pages`);
  console.log(`BUILD static indexes=${generatedIndexSections.size} sitemap URLs=${sitemapCount}`);
}

main().catch((error) => {
  console.error(`BUILD FAILED: ${error.message}`);
  process.exit(1);
});
