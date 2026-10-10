import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.APP_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
let checks = 0;
const passed = label => { checks++; console.log(`PASS ${label}`); };
page.on('pageerror', error => errors.push(error.message));
const mood = async value => page.waitForFunction(expected => (document.querySelector('.modal .jobu-mascot') || document.querySelector('#app .jobu-mascot'))?.dataset.mood === expected, value);
async function contrast(selector, pseudo = '') {
  const ratio = await page.locator(selector).first().evaluate((element, pseudo) => {
    const rgb = color => color.match(/[\d.]+/g).map(Number);
    const luminance = values => values.slice(0,3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i], 0);
    const foreground = rgb(getComputedStyle(element, pseudo || null).color);
    let node = element, background = [255,255,255];
    while (node) {
      const color = rgb(getComputedStyle(node).backgroundColor);
      if (color[3] === 1) { background = color; break; }
      node = node.parentElement;
    }
    const a = luminance(foreground), b = luminance(background);
    return (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
  }, pseudo);
  assert.ok(ratio >= 4.5, `${selector} ${pseudo}: ${ratio.toFixed(2)}:1 is below AA text contrast`);
}
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.match(await page.title(), /^jobu! —/);
  assert.equal((await page.locator('.wordmark').innerText()).replace(/\s/g,''), 'jobu!');
  assert.equal(await page.locator('.jobu-mascot').count(), 1);
  assert.equal(await page.locator('.jobu-mascot').getAttribute('aria-hidden'), 'true');
  passed('jobu! identity is consistent and its decorative mascot adds no tab stop');

  for (const selector of ['h1','.eyebrow','.inbox-heading p','.folder-tab.active','.folder-tab:not(.active)','.row-title','.row-company','.row-company small','.row-preview','.row-salary','.row-found','.prototype-note','.list-order','.inbox-footer span','.add-job','#mode-select']) await contrast(selector);
  await contrast('#job-search', '::placeholder');
  await page.locator('[data-action="open-job"][data-id="j2"]').click();
  for (const selector of ['.detail-heading h2','.detail-heading p','.job-facts small','.job-facts strong','.job-description h3','.jd-text','.source-caption','.text-link','.score-pair small','.score-caption','.pill.ready']) await contrast(selector);
  await page.locator('.detail-toolbar [data-action="close-detail"]').first().click();
  await page.locator('[data-action="open-job"][data-id="j4"]').click();
  await contrast('.pill.unknown');
  await page.locator('.detail-toolbar [data-action="close-detail"]').first().click();
  passed('Normal-sized inbox and detail text meet 4.5:1 contrast, including primary actions and placeholders');

  await page.evaluate(() => document.activeElement.blur());
  await page.mouse.move(10,100);
  await mood('calm');
  await page.mouse.move(20, 950);
  await page.waitForFunction(() => parseFloat(document.querySelector('.jobu-mascot').style.getPropertyValue('--look-x')) < -2);
  await page.mouse.move(1420, 10);
  await page.waitForFunction(() => parseFloat(document.querySelector('.jobu-mascot').style.getPropertyValue('--look-x')) > 1.5);
  const position = await page.locator('.jobu-mascot').evaluate(el => [parseFloat(el.style.getPropertyValue('--look-x')),parseFloat(el.style.getPropertyValue('--look-y'))]);
  assert.ok(Math.abs(position[0]) <= 5.5 && Math.abs(position[1]) <= 4);
  await page.waitForFunction(() => document.querySelector('.jobu-mascot').classList.contains('is-blinking'), null, { timeout: 9500 });
  passed('Pupils smoothly follow the mouse within eye bounds, and the character blinks');

  await page.locator('[data-action="add-job"]').hover(); await mood('curious');
  await page.locator('.jobu-mascot').hover(); await mood('playful');
  await page.locator('.row-save[data-id="j1"]').click(); await mood('happy');
  await page.locator('#job-search').fill('no-such-job'); await mood('surprised');
  assert.equal(await page.locator('.jobu-mascot').count(), 1);
  await page.locator('[data-action="show-all"]').click();
  await page.locator('[data-action="add-job"]').click();
  await page.locator('[name="title"]').fill('Visual Designer');
  await page.locator('[name="company"]').fill('Example');
  await page.locator('#job-form [name="description"]').fill('Visual design and campaign work with typography and brand identity');
  await page.locator('[name="salaryMin"]').fill('50000');
  await page.locator('[name="salaryMax"]').fill('30000');
  await page.locator('#job-form [type="submit"]').click(); await mood('surprised');
  assert.ok((await page.locator('#job-form-error').innerText()).length > 0);
  await page.locator('.modal-close').click();
  passed('Hover, wink, save, empty search, and invalid salary trigger appropriate expressions with usable text');

  let releaseMap;
  const mapGate = new Promise(resolve => { releaseMap = resolve; });
  await context.route('https://www.google.com/maps?**', async route => {
    await mapGate;
    await route.fulfill({ contentType: 'text/html', body: '<h1>Provider test</h1>' });
  });
  await page.locator('[data-action="open-job"][data-id="j2"]').click();
  await page.locator('[data-action="load-map"]').click(); await mood('waiting');
  releaseMap();
  await page.frameLocator('.map-frame iframe').locator('h1').waitFor(); await mood('calm');
  await page.keyboard.press('Escape');
  passed('A user-requested map load gives a waiting reaction and returns to calm (provider mocked)');

  const motion = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  const rp = await motion.newPage(); rp.on('pageerror', error => errors.push(error.message));
  await rp.goto(base, { waitUntil: 'networkidle' });
  await rp.mouse.move(1400, 950);
  const still = await rp.locator('.jobu-mascot').evaluate(el => ({ x: el.style.getPropertyValue('--look-x'), y: el.style.getPropertyValue('--look-y'), idle: getComputedStyle(el.querySelector('svg')).animationName, transition: getComputedStyle(el.querySelector('.mascot-eye')).transitionDuration }));
  assert.deepEqual(still, { x: '0px', y: '0px', idle: 'none', transition: '0s' });
  await rp.locator('.row-save[data-id="j1"]').click();
  assert.equal(await rp.locator('.jobu-mascot').getAttribute('data-mood'), 'happy');
  await motion.close();
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const tp = await touch.newPage(); tp.on('pageerror', error => errors.push(error.message));
  await tp.goto(base, { waitUntil: 'networkidle' });
  await tp.locator('.row-save[data-id="j1"]').tap();
  assert.equal(await tp.locator('.jobu-mascot').getAttribute('data-mood'), 'happy');
  assert.equal(await tp.locator('.jobu-mascot').evaluate(el => el.style.getPropertyValue('--look-x')), '0px');
  await tp.locator('[data-action="add-job"]').tap();
  assert.equal(await tp.locator('#job-form').isVisible(), true);
  await touch.close();
  passed('Reduced motion keeps the face still; touch keeps centred eyes and working action reactions');

  for (const width of [320,360,390,768,900,1024,1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('[data-folder="all"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `inbox overflow at ${width}`);
    assert.equal(await page.locator('[data-action="add-job"]').isVisible(), true);
    await page.locator('[data-action="add-job"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `import overflow at ${width}`);
    await page.locator('.modal-close').click();
    await page.locator('[data-action="open-job"][data-id="j2"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `detail overflow at ${width}`);
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []);
  passed('Inbox, mascot, import, and detail fit seven screen widths from 320px with no script errors');
  console.log(`\n${checks} identity and mascot checks passed.`);
} finally { await context.close(); await browser.close(); }
