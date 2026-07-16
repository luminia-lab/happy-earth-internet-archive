const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
const screenshotDir = process.env.SCREENSHOT_DIR || '/tmp';
const routes = [
  '/', '/archive/', '/vigor/', '/lucky/', '/travel/', '/origin/', '/backstage/',
  '/articles/', '/articles/why-we-understand-dogs/', '/articles/new-zealand-winter-clothing/',
  '/articles/alishan-stay-areas-guide/', '/events/', '/events/animal-family-meetup/',
  '/news/', '/news/information-correction-hub/', '/404.html'
];

mkdirSync(screenshotDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const remoteRequests = [];
  const nonGetRequests = [];
  let mutedNoteCount = 0;

  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('request', (request) => {
    if (!request.url().startsWith(base)) remoteRequests.push(request.url());
    if (request.method() !== 'GET') nonGetRequests.push(`${request.method()} ${request.url()}`);
  });

  const checkMutedNotes = async (selector, label) => {
    const samples = await page.locator(selector).evaluateAll((nodes) => nodes
      .filter((node) => {
        const style = getComputedStyle(node);
        return !node.hidden && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((node) => {
        const style = getComputedStyle(node);
        return {
          color: style.color,
          fontSize: parseFloat(style.fontSize),
          fontWeight: parseInt(style.fontWeight, 10),
          lineHeight: parseFloat(style.lineHeight)
        };
      }));

    if (!samples.length) {
      errors.push(`${label}: muted note sample missing`);
      return;
    }

    for (const sample of samples) {
      mutedNoteCount += 1;
      if (sample.fontSize < 12.4 || sample.fontSize > 14.2) {
        errors.push(`${label}: font size ${sample.fontSize}px is outside 0.78rem–0.88rem`);
      }
      if (sample.fontWeight > 500) errors.push(`${label}: font weight ${sample.fontWeight} is too heavy`);
      if (!Number.isFinite(sample.lineHeight) || sample.lineHeight / sample.fontSize < 1.5) {
        errors.push(`${label}: line height is below 1.5`);
      }
      const rgb = sample.color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
      if (rgb.length !== 3 || Math.max(...rgb) - Math.min(...rgb) > 40) {
        errors.push(`${label}: color ${sample.color} is not a neutral gray`);
      }
    }
  };

  const checkImage = async (selector, label) => {
    const image = page.locator(selector);
    if (!await image.isVisible()) {
      errors.push(`${label}: image is not visible`);
      return;
    }
    const details = await image.evaluate((node) => ({
      naturalWidth: node.naturalWidth,
      naturalHeight: node.naturalHeight,
      width: node.getBoundingClientRect().width,
      viewportWidth: innerWidth,
      objectFit: getComputedStyle(node).objectFit
    }));
    if (!details.naturalWidth || !details.naturalHeight) errors.push(`${label}: image failed to load`);
    if (details.width > details.viewportWidth + 1) errors.push(`${label}: image exceeds the mobile viewport`);
    if (details.objectFit !== 'cover') errors.push(`${label}: object-fit is ${details.objectFit}, expected cover`);
  };

  for (const route of routes) {
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response || response.status() >= 400) errors.push(`${route}: HTTP ${response?.status()}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) errors.push(`${route}: horizontal overflow ${overflow}px`);
  }

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const channels = await page.locator('.channel-grid a').evaluateAll((links) => links.map((link) => ({
    label: link.textContent.trim(),
    href: link.getAttribute('href')
  })));
  const expectedChannels = [
    ['生活', 'articles/'], ['旅遊', 'articles/'], ['健康', 'vigor/'], ['活動', 'events/'],
    ['娛樂', 'articles/?channel=entertainment'], ['社會', 'news/'], ['心靈', 'origin/']
  ];
  if (JSON.stringify(channels.map(({ label, href }) => [label, href])) !== JSON.stringify(expectedChannels)) {
    errors.push(`/: channel routes differ: ${JSON.stringify(channels)}`);
  }
  await checkMutedNotes('.mini-list .muted-note', '/: event status notes');
  await page.locator('.section[aria-labelledby="channels-title"]').screenshot({
    path: join(screenshotDir, 'happy-earth-v0.2.2-home-channels-mobile.png')
  });
  await page.getByRole('link', { name: '娛樂', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const entertainmentUrl = new URL(page.url());
  if (entertainmentUrl.pathname === '/origin/' || entertainmentUrl.pathname !== '/articles/' || entertainmentUrl.search !== '?channel=entertainment') {
    errors.push(`/: entertainment route resolved to ${entertainmentUrl.pathname}${entertainmentUrl.search}`);
  }

  await page.goto(`${base}/lucky/`, { waitUntil: 'networkidle' });
  await checkImage('.winner-panel img[src$="couple-winner-travel.webp"]', '/lucky/ winner');
  await checkMutedNotes('.winner-panel .image-caption', '/lucky/: winner caption');
  await page.locator('.winner-panel').screenshot({
    path: join(screenshotDir, 'happy-earth-v0.2.2-lucky-winner-mobile.png')
  });
  const wheelWidth = await page.locator('#wheel').evaluate((node) => node.getBoundingClientRect().width);
  if (wheelWidth > 300) errors.push(`/lucky/: mobile wheel too wide (${wheelWidth}px)`);
  await page.click('#spinButton');
  await page.waitForSelector('#resultModal.open');
  const modalCentered = await page.locator('.prize-modal').evaluate((node) => {
    const box = node.getBoundingClientRect();
    return Math.abs((box.left + box.width / 2) - innerWidth / 2) < 2 && Math.abs((box.top + box.height / 2) - innerHeight / 2) < 2;
  });
  if (!modalCentered) errors.push('/lucky/: prize modal is not centered');
  await page.click('#claimStart');
  await page.check('#adultCheck');
  await page.click('#stepButton');
  await checkMutedNotes('#stepBody .small', '/lucky/: sharing helper');
  await page.locator('#shareRange').evaluate((node) => { node.value = '5'; node.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#stepButton');
  await checkMutedNotes('#stepBody .small', '/lucky/: form helper');
  await page.fill('#stepBody input[placeholder="王小明"]', '測試資料');
  await page.click('#stepButton');
  await checkMutedNotes('#stepBody .small', '/lucky/: payment helper');
  await page.click('#stepButton');
  if (!await page.locator('#trapPanel').isVisible()) errors.push('/lucky/: claim flow did not reach final panel');
  await page.click('#repeatClaim');
  if (!await page.locator('#adultCheck').isVisible()) errors.push('/lucky/: repeat claim did not reset to step 1');
  let storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
  if (storage.local || storage.session) errors.push('/lucky/: browser storage contains form data');

  await page.goto(`${base}/travel/`, { waitUntil: 'networkidle' });
  if ((await page.locator('body').innerText()).includes('桃園幸福生活節')) errors.push('/travel/: leaked Taoyuan campaign branding');
  await checkImage('.winner-panel img[src$="couple-winner-travel.webp"]', '/travel/ winner');
  await checkMutedNotes('.travel-note.muted-note', '/travel/: activity note');
  await checkMutedNotes('.winner-panel .image-caption', '/travel/: winner caption');
  await page.click('#spinButton');
  await page.waitForSelector('#resultModal.open');
  if (!await page.getByText('雙人紐西蘭幸福之旅', { exact: true }).isVisible()) errors.push('/travel/: travel prize missing from modal');
  await page.click('#claimStart');
  await page.check('#adultCheck');
  await page.click('#stepButton');
  if (!await page.getByText('完成三題旅遊偏好').isVisible()) errors.push('/travel/: travel-specific step missing');

  await page.goto(`${base}/origin/`, { waitUntil: 'networkidle' });
  const initialOriginState = await page.evaluate(() => ({
    introVisible: !document.getElementById('introPanel').hidden,
    quizHidden: document.getElementById('quizPanel').hidden,
    resultHidden: document.getElementById('resultPanel').hidden,
    resultAriaHidden: document.getElementById('resultPanel').getAttribute('aria-hidden')
  }));
  if (!initialOriginState.introVisible || !initialOriginState.quizHidden || !initialOriginState.resultHidden || initialOriginState.resultAriaHidden !== 'true') {
    errors.push(`/origin/: invalid intro state ${JSON.stringify(initialOriginState)}`);
  }
  await checkMutedNotes('#introPanel .helper-text', '/origin/: intro helper');
  await page.screenshot({ path: join(screenshotDir, 'happy-earth-v0.2.2-origin-intro-mobile.png'), fullPage: true });
  await page.click('#startQuiz');
  if (!await page.locator('#quizPanel').isVisible() || await page.locator('#resultPanel').isVisible()) {
    errors.push('/origin/: quiz state did not hide the result');
  }
  for (let answer = 0; answer < 12; answer += 1) await page.locator('[data-answer]').first().click();
  await page.waitForSelector('#resultPanel:not([hidden])');
  if (await page.locator('#quizPanel').isVisible()) errors.push('/origin/: quiz remained visible in result state');
  await checkImage('#resultPanel img[src$="couple-origin-resonance.webp"]', '/origin/ result');
  await checkMutedNotes('#resultPanel .image-caption', '/origin/: result caption');
  await page.screenshot({ path: join(screenshotDir, 'happy-earth-v0.2.2-origin-result-mobile.png'), fullPage: true });
  await page.reload({ waitUntil: 'networkidle' });
  if (!await page.locator('#introPanel').isVisible() || await page.locator('#quizPanel').isVisible() || await page.locator('#resultPanel').isVisible()) {
    errors.push('/origin/: refresh did not restore intro state');
  }
  storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
  if (storage.local || storage.session) errors.push('/origin/: browser storage is not empty');

  await page.goto(`${base}/articles/why-we-understand-dogs/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.article-main');
  await checkMutedNotes('.article-meta', '/articles/: metadata');
  await checkMutedNotes('.article-note', '/articles/: secondary note');

  await page.goto(`${base}/vigor/`, { waitUntil: 'networkidle' });
  const animationName = await page.locator('.vigor-blanket img').evaluate((node) => getComputedStyle(node).animationName);
  if (animationName !== 'none') errors.push('/vigor/: reduced-motion did not disable blanket animation');
  await checkMutedNotes('.vigor-disclaimer.disclaimer', '/vigor/: disclaimer');
  await page.locator('[data-modal-open="consultModal"]').first().click();
  await page.waitForSelector('#consultModal.open');
  await checkMutedNotes('#consultModal .helper-text', '/vigor/: consultant modal helpers');

  await browser.close();
  if (mutedNoteCount < 8) errors.push(`muted note coverage too low: ${mutedNoteCount}`);
  if (remoteRequests.length) errors.push(`external requests detected: ${[...new Set(remoteRequests)].join(', ')}`);
  if (nonGetRequests.length) errors.push(`non-GET requests detected: ${[...new Set(nonGetRequests)].join(', ')}`);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`PASS mobile viewport 390x844: ${routes.length} routes, no horizontal overflow`);
  console.log('PASS seven homepage channels; entertainment routes to articles, not Origin');
  console.log('PASS Lucky/Travel winner image; Origin intro, quiz, and result states');
  console.log(`PASS ${mutedNoteCount} helper/caption/disclaimer samples use small neutral-gray styling`);
  console.log('PASS no external requests, form submissions, or local/session storage');
})();
