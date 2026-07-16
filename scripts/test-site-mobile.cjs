const { chromium } = require('playwright');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
const routes = [
  '/', '/archive/', '/vigor/', '/lucky/', '/travel/', '/origin/', '/backstage/',
  '/articles/', '/articles/why-we-understand-dogs/', '/articles/new-zealand-winter-clothing/',
  '/articles/alishan-stay-areas-guide/', '/events/', '/events/animal-family-meetup/',
  '/news/', '/news/information-correction-hub/', '/404.html'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const remoteRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('request', (request) => {
    if (!request.url().startsWith(base)) remoteRequests.push(request.url());
  });

  for (const route of routes) {
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    if (!response || response.status() >= 400) errors.push(`${route}: HTTP ${response?.status()}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) errors.push(`${route}: horizontal overflow ${overflow}px`);
  }

  await page.goto(`${base}/lucky/`, { waitUntil: 'networkidle' });
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
  await page.locator('#shareRange').evaluate((node) => { node.value = '5'; node.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#stepButton');
  await page.fill('#stepBody input[placeholder="王小明"]', '測試資料');
  await page.click('#stepButton');
  await page.click('#stepButton');
  if (!await page.locator('#trapPanel').isVisible()) errors.push('/lucky/: claim flow did not reach final panel');
  await page.click('#repeatClaim');
  if (!await page.locator('#adultCheck').isVisible()) errors.push('/lucky/: repeat claim did not reset to step 1');
  const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
  if (storage.local || storage.session) errors.push('/lucky/: browser storage contains form data');

  await page.goto(`${base}/travel/`, { waitUntil: 'networkidle' });
  if ((await page.locator('body').innerText()).includes('桃園幸福生活節')) errors.push('/travel/: leaked Taoyuan campaign branding');
  await page.click('#spinButton');
  await page.waitForSelector('#resultModal.open');
  if (!await page.getByText('雙人紐西蘭幸福之旅', { exact: true }).isVisible()) errors.push('/travel/: travel prize missing from modal');
  await page.click('#claimStart');
  await page.check('#adultCheck');
  await page.click('#stepButton');
  if (!await page.getByText('完成三題旅遊偏好').isVisible()) errors.push('/travel/: travel-specific step missing');

  await page.goto(`${base}/vigor/`, { waitUntil: 'networkidle' });
  const animationName = await page.locator('.vigor-blanket img').evaluate((node) => getComputedStyle(node).animationName);
  if (animationName !== 'none') errors.push('/vigor/: reduced-motion did not disable blanket animation');

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/happy-earth-mobile-home.png', fullPage: true });
  await page.goto(`${base}/lucky/`, { waitUntil: 'networkidle' });
  await page.click('#spinButton');
  await page.waitForSelector('#resultModal.open');
  await page.screenshot({ path: '/tmp/happy-earth-mobile-lucky-modal.png', fullPage: false });

  await browser.close();
  if (remoteRequests.length) errors.push(`external requests detected: ${[...new Set(remoteRequests)].join(', ')}`);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`PASS mobile viewport 390x844: ${routes.length} routes, no horizontal overflow`);
  console.log('PASS Lucky modal centered; repeatable flow; no local/session storage');
  console.log('PASS Travel branding isolated; Vigor reduced-motion honored');
})();
