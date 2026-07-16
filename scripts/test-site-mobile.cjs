const { mkdirSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { chromium } = require('playwright');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
const screenshotDir = process.env.SCREENSHOT_DIR || '/tmp/happy-earth-v0.3.2-screenshots';
const content = JSON.parse(readFileSync(resolve(__dirname, '../site/assets/data/content.json'), 'utf8'));
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
const mobileRoutes = [
  '/', '/articles/', '/articles/relationship-fades-signs/', '/news/',
  '/news/information-correction-hub/', '/events/', '/events/animal-family-meetup/',
  '/topics/', '/origin/', '/lucky/', '/travel/', '/vigor/', '/archive/', '/404.html'
];

mkdirSync(screenshotDir, { recursive: true });

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const expectedBody = (entry) => normalize(entry.content.map((block) => (
  block.type === 'list' ? block.items.join(' ') : block.text
)).join(' '));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await mobile.newPage();
  const errors = [];
  const remoteRequests = [];
  const nonGetRequests = [];

  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('request', (request) => {
    if (!request.url().startsWith(base)) remoteRequests.push(request.url());
    if (request.method() !== 'GET') nonGetRequests.push(`${request.method()} ${request.url()}`);
  });

  const goto = async (route) => {
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response || response.status() >= 400) errors.push(`${route}: HTTP ${response?.status()}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) errors.push(`${route}: horizontal overflow ${overflow}px`);
  };

  const assertMobileNav = async (route) => {
    const toggle = page.locator('.mobile-nav-toggle');
    if (!await toggle.isVisible()) errors.push(`${route}: mobile navigation toggle is missing`);
    if (await toggle.getAttribute('aria-controls') !== 'mobile-global-navigation') errors.push(`${route}: aria-controls is incorrect`);
    if (await toggle.getAttribute('aria-expanded') !== 'false') errors.push(`${route}: navigation is not initially closed`);
  };

  for (const route of mobileRoutes) {
    await goto(route);
    await assertMobileNav(route);
  }

  await goto('/');
  await page.screenshot({ path: join(screenshotDir, '01-home-mobile-menu-closed.png') });
  const toggle = page.locator('.mobile-nav-toggle');
  await toggle.click();
  await page.locator('#mobile-global-navigation.open').waitFor();
  if (await toggle.getAttribute('aria-expanded') !== 'true') errors.push('/: aria-expanded did not change on open');
  const openState = await page.evaluate(() => ({
    overflow: getComputedStyle(document.body).overflow,
    active: document.activeElement?.className,
    links: [...document.querySelectorAll('.mobile-nav-links a')].map((link) => link.textContent.trim())
  }));
  if (openState.overflow !== 'hidden') errors.push('/: background scroll was not locked');
  if (!String(openState.active).includes('mobile-nav-close')) errors.push('/: focus did not move into the drawer');
  const requiredMenu = ['首頁', '文章總覽', '生活', '旅遊', '健康', '活動', '娛樂', '社會', '心靈', '標籤總覽', '內容透明度'];
  if (JSON.stringify(openState.links) !== JSON.stringify(requiredMenu)) errors.push(`/: unexpected mobile menu ${JSON.stringify(openState.links)}`);
  await page.screenshot({ path: join(screenshotDir, '02-home-mobile-menu-open.png') });
  await page.keyboard.press('Escape');
  if (await toggle.getAttribute('aria-expanded') !== 'false') errors.push('/: Escape did not close navigation');
  if (await page.evaluate(() => getComputedStyle(document.body).overflow) === 'hidden') errors.push('/: background scroll stayed locked after close');

  await toggle.click();
  await page.locator('.mobile-nav-backdrop.open').click({ position: { x: 12, y: 420 } });
  if (await toggle.getAttribute('aria-expanded') !== 'false') errors.push('/: backdrop did not close navigation');
  await toggle.click();
  await page.locator('.mobile-nav-close').click();
  if (await toggle.getAttribute('aria-expanded') !== 'false') errors.push('/: close button did not close navigation');
  await toggle.click();
  await page.getByRole('link', { name: '標籤總覽', exact: true }).click();
  await page.waitForLoadState('networkidle');
  if (!new URL(page.url()).pathname.endsWith('/topics/')) errors.push('/: mobile navigation link did not navigate to Topics');

  await goto('/vigor/');
  await page.locator('[data-modal-open="consultModal"]').first().click();
  await page.locator('#consultModal.open').waitFor();
  const vigorModal = await page.evaluate(() => {
    const status = document.querySelector('#consultModal .modal-status');
    const helper = document.querySelector('#consultModal .helper-text');
    const modal = document.querySelector('#consultModal .modal').getBoundingClientRect();
    const statusBox = status.getBoundingClientRect();
    const helperBox = helper.getBoundingClientRect();
    const statusStyle = getComputedStyle(status);
    const helperStyle = getComputedStyle(helper);
    return {
      statusText: status.textContent.trim(),
      statusColor: statusStyle.color,
      statusSize: parseFloat(statusStyle.fontSize),
      statusWeight: parseInt(statusStyle.fontWeight, 10),
      helperSize: parseFloat(helperStyle.fontSize),
      helperColor: helperStyle.color,
      clipped: statusBox.left < modal.left || statusBox.right > modal.right || helperBox.left < modal.left || helperBox.right > modal.right
    };
  });
  if (vigorModal.statusText !== '今日名額已滿。') errors.push('/vigor/: status sentence is incorrect');
  if (vigorModal.statusWeight < 700 || vigorModal.statusSize < 15 || vigorModal.statusSize > 17) errors.push(`/vigor/: status hierarchy is ${vigorModal.statusSize}px/${vigorModal.statusWeight}`);
  if (vigorModal.helperSize >= vigorModal.statusSize) errors.push('/vigor/: helper is not smaller than status');
  if (vigorModal.statusColor === vigorModal.helperColor) errors.push('/vigor/: status and helper use the same color');
  if (vigorModal.clipped) errors.push('/vigor/: modal copy is clipped');
  await page.screenshot({ path: join(screenshotDir, '03-vigor-modal-mobile.png') });

  const chineseTag = '感情';
  const expectedTagCount = content.filter((item) => item.tags.includes(chineseTag)).length;
  await goto(`/topics/?tag=${encodeURIComponent(chineseTag)}`);
  await page.waitForSelector('.content-card');
  const topicState = await page.evaluate(() => ({
    title: document.querySelector('[data-topic-title]').textContent.trim(),
    summary: document.querySelector('[data-topic-summary]').textContent.trim(),
    count: document.querySelectorAll('.content-card').length,
    clearVisible: !document.querySelector('[data-topic-clear]').hidden,
    clearHref: document.querySelector('[data-topic-clear]').href
  }));
  if (topicState.title !== '# 感情' || topicState.count !== expectedTagCount || !topicState.summary.includes(String(expectedTagCount))) errors.push(`/topics/: Chinese tag result mismatch ${JSON.stringify(topicState)}`);
  if (!topicState.clearVisible || !new URL(topicState.clearHref).pathname.endsWith('/topics/')) errors.push('/topics/: clear-tag action is unavailable');
  await page.locator('[data-topic-clear]').focus();
  const focusStyle = await page.locator('[data-topic-clear]').evaluate((node) => ({ style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
  if (focusStyle.style === 'none' || focusStyle.width < 2) errors.push('/topics/: keyboard focus is not clear');
  await page.screenshot({ path: join(screenshotDir, '04-topics-chinese-tag-mobile.png'), fullPage: true });

  await goto('/topics/?tag=%E4%B8%8D%E5%AD%98%E5%9C%A8%E7%9A%84%E6%A8%99%E7%B1%A4');
  if (!await page.locator('.topic-empty').isVisible()) errors.push('/topics/: no-result state is missing');
  await page.locator('[data-topic-clear]').click();
  await page.waitForSelector('.content-card');
  if (await page.locator('.content-card').count() !== content.length) errors.push('/topics/: clearing the tag did not show all content');

  const renderedBodies = [];
  for (const [index, slug] of fillerSlugs.slice(0, 5).entries()) {
    await goto(`/articles/${slug}/`);
    await page.waitForSelector('.article-body');
    const rendered = normalize(await page.locator('.article-body').innerText());
    const source = content.find((item) => item.slug === slug);
    if (rendered !== expectedBody(source)) errors.push(`/articles/${slug}/: rendered body differs from content.json`);
    renderedBodies.push(rendered);
    if (index === 0) {
      const tagHref = await page.getByRole('link', { name: '查看標籤 感情 的內容' }).getAttribute('href');
      if (!tagHref.includes('%E6%84%9F%E6%83%85')) errors.push(`/articles/${slug}/: Chinese tag URL is not encoded`);
      await page.screenshot({ path: join(screenshotDir, '05-filler-relationship-mobile.png') });
    }
    if (index === 1) await page.screenshot({ path: join(screenshotDir, '06-filler-silent-mobile.png') });
  }
  if (new Set(renderedBodies).size !== renderedBodies.length) errors.push('rendered filler article bodies are not distinct');

  await goto('/');
  const firstNotice = page.locator('.notice').first();
  await firstNotice.waitFor({ timeout: 4000 });
  const noticeBounds = await firstNotice.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: innerWidth, height: innerHeight };
  });
  if (noticeBounds.left < 0 || noticeBounds.right > noticeBounds.width || noticeBounds.top < 0 || noticeBounds.bottom > noticeBounds.height) errors.push('/: notice exceeds the viewport');
  await firstNotice.locator('.notice-close').click();
  await firstNotice.waitFor({ state: 'detached' });
  await page.waitForTimeout(5400);
  if (await page.locator('.notice').count()) errors.push('/: notices did not auto-dismiss');

  const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
  if (storage.local || storage.session) errors.push('/: browser storage is not empty');

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(`${base}/`, { waitUntil: 'networkidle' });
  if (!await desktopPage.locator('.site-header .nav').isVisible()) errors.push('desktop: existing horizontal navigation is hidden');
  if (await desktopPage.locator('.mobile-nav-toggle').isVisible()) errors.push('desktop: mobile navigation toggle is visible');
  const desktopOverflow = await desktopPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (desktopOverflow > 1) errors.push(`desktop: horizontal overflow ${desktopOverflow}px`);
  await browser.close().catch(() => {});
  if (remoteRequests.length) errors.push(`external requests detected: ${[...new Set(remoteRequests)].join(', ')}`);
  if (nonGetRequests.length) errors.push(`non-GET requests detected: ${[...new Set(nonGetRequests)].join(', ')}`);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`PASS mobile viewport 390x844: ${mobileRoutes.length} routes, shared navigation, no horizontal overflow`);
  console.log('PASS hamburger close button, backdrop, Escape, focus, scroll lock, and navigation');
  console.log('PASS Vigor modal hierarchy; Topics Chinese query, empty state, clear action, and focus');
  console.log('PASS five rendered filler articles match distinct content.json bodies');
  console.log('PASS notices close immediately, auto-dismiss, stack within viewport, and use no storage');
  console.log('PASS desktop 1280x800 keeps horizontal navigation and hides mobile controls');
  console.log('PASS no external requests or non-GET requests');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
