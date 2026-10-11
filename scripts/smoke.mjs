import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.APP_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
let checks = 0;
let mapRequests = [];
const passed = name => { checks++; console.log(`PASS ${name}`); };
const folder = async value => page.locator(`[data-action="folder"][data-folder="${value}"]`).click();
const open = async id => page.locator(`[data-action="open-job"][data-id="${id}"]`).click();
const close = async () => page.locator('.detail-toolbar [data-action="close-detail"]').first().click();
const closeModal = async () => page.locator('.modal-close').click();
page.on('pageerror', e => errors.push(e.message));
// Verify the provider URL and opt-in behaviour without depending on Google availability.
await context.route('https://www.google.com/maps?**', route => { mapRequests.push(route.request().url()); return route.fulfill({ contentType: 'text/html', body: '<h1>Map provider test response</h1>' }); });
await context.route('https://careers.example.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Test application page</h1>' }));
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.job-row').count(), 8);
  assert.equal(await page.locator('.job-detail').count(), 0);
  assert.equal(await page.locator('.career-banner,.kanban,.compare-bar').count(), 0);
  assert.match(await page.locator('.prototype-note').innerText(), /ตัวอย่าง/);
  assert.match(await page.locator('.inbox-heading p').innerText(), /8 งาน/);
  passed('Initial screen is a job inbox with eight unread demos and no dashboard');

  assert.equal(await page.locator('.brand-mark').count(), 0);
  const tierLetters = await page.locator('.row-match .tier-badge b').allTextContents();
  assert.deepEqual([...new Set(tierLetters)].sort(), ['A','B','C','S']);
  assert.equal(await page.locator('.score-pair,.growth').count(), 0);
  passed('All four labelled tiers appear in the inbox; the leading logo and numeric growth UI are removed');

  await open('j2');
  assert.match(await page.locator('.job-description').innerText(), /ออกแบบ key visual/);
  assert.match(await page.locator('.job-facts').innerText(), /35,000–48,000/);
  assert.match(await page.locator('.job-facts').innerText(), /อารีย์/);
  assert.equal(await page.locator('[data-action="open-job"][data-id="j2"]').evaluate(el => el.closest('.job-row').classList.contains('read')), true);
  assert.match(await page.locator('.inbox-heading p').innerText(), /7 งาน/);
  assert.equal(await page.locator('.apply-area button').isDisabled(), true);
  assert.equal(await page.locator('.tier-summary').count(), 1);
  assert.doesNotMatch(await page.locator('.match-section').innerText(), /\/100|โอกาสเติบโต/);
  passed('Opening a row marks it read and reveals JD, salary, location, and stats');

  assert.equal(mapRequests.length, 0);
  assert.equal(await page.locator('.map-frame iframe').count(), 0);
  await page.locator('[data-action="load-map"]').click();
  await page.frameLocator('.map-frame iframe').locator('h1').waitFor();
  assert.equal(mapRequests.length, 1);
  assert.equal(new URL(mapRequests[0]).searchParams.get('q'), 'BTS Ari Bangkok Thailand');
  assert.match(await page.locator('.map-caption').innerText(), /ย่านตัวอย่าง/);
  await close();
  await open('j1');
  assert.match(await page.locator('.map-empty').innerText(), /Remote/);
  assert.equal(await page.locator('[data-action="load-map"]').count(), 0);
  passed('Maps load only on request, with correct query; remote has no fictitious pin');

  await close();
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.job-row').count(), 6);
  await folder('all');
  assert.equal(await page.locator('.job-row').count(), 8);
  await open('j2');
  await page.locator('.detail-actions [data-action="save"]').click();
  await close();
  await folder('saved');
  assert.equal(await page.locator('.job-row').count(), 1);
  await page.reload({ waitUntil: 'networkidle' });
  await folder('saved');
  assert.equal(await page.locator('.job-row').count(), 1);
  passed('Read state and saved membership survive refresh');

  await open('j2');
  await page.locator('[data-action="unread"]').click();
  await folder('new');
  assert.equal(await page.locator('[data-action="open-job"][data-id="j2"]').count(), 1);
  assert.equal(await page.locator('[data-action="open-job"][data-id="j2"]').evaluate(el => el.closest('.job-row').classList.contains('unread')), true);
  passed('Marking unread returns a job to the new inbox');

  await folder('all');
  await page.locator('#mode-select').selectOption('remote');
  assert.equal(await page.locator('.job-row').count(), 5);
  await page.locator('#mode-select').selectOption('all');
  await page.locator('#job-search').fill('Orbit');
  assert.equal(await page.locator('.job-row').count(), 1);
  await page.locator('#job-search').fill('no-such-company');
  assert.equal(await page.locator('.empty-state').count(), 1);
  await page.locator('[data-action="show-all"]').click();
  passed('Search, work-mode filtering, and empty-state recovery');

  await open('j4');
  assert.match(await page.locator('.job-facts').innerText(), /ยังไม่ระบุ/);
  assert.equal(await page.locator('.detail-status .tier-badge').getAttribute('aria-label'), 'Tier A · น่าสมัคร');
  assert.match(await page.locator('.detail-status').innerText(), /รอเช็กข้อมูล/);
  await close();
  passed('Missing salary is flagged separately and does not lower the fit tier');

  await page.locator('.profile-button').click();
  await page.locator('[name="maxOfficeDays"]').selectOption('0');
  await page.locator('[name="salaryFloor"]').fill('50000');
  await page.locator('[name="name"]').fill('Pun Inbox');
  await page.locator('#profile-form [type="submit"]').click();
  await open('j2');
  assert.match(await page.locator('.constraint-notice').innerText(), /เกินที่ตั้งไว้ 0 วัน/);
  assert.match(await page.locator('.constraint-notice').innerText(), /เพดานเงินเดือนต่ำกว่า/);
  await close();
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.profile-button').click();
  assert.equal(await page.locator('[name="name"]').inputValue(), 'Pun Inbox');
  await closeModal();
  passed('Editable profile persists and flags office-day / salary conflicts');

  await page.locator('.profile-button').click();
  await page.locator('.settings-evidence summary').click();
  assert.equal(await page.locator('.settings-evidence .evidence-project').count(), 7);
  await page.locator('.settings-evidence [data-id="sybil"]').click();
  assert.match(await page.locator('.evidence-notes').innerText(), /ยังไม่เห็น mobile/);
  assert.equal(await page.locator('.project-preview').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await closeModal();
  passed('Portfolio evidence is available in settings with actual previews and limitations');

  await page.locator('[data-action="add-job"]').click();
  await page.locator('[name="title"]').fill('Junior UI Designer');
  await page.locator('[name="company"]').fill('<img src=x onerror=alert(1)>');
  await page.locator('#job-form [name="description"]').fill('ออกแบบ responsive UI ด้วย Figma Components และ interactive prototype\n<script>alert(1)</script>');
  await page.locator('[name="mode"]').selectOption('hybrid');
  await page.locator('[name="officeDays"]').selectOption('1');
  await page.locator('[name="location"]').fill('BTS Ari Bangkok Thailand');
  await page.locator('[name="salaryMin"]').fill('50000');
  await page.locator('[name="salaryMax"]').fill('30000');
  await page.locator('[name="applicationUrl"]').fill('https://careers.example.com/apply/ui');
  await page.locator('#job-form [type="submit"]').click();
  assert.match(await page.locator('#job-form-error').innerText(), /ต้องไม่สูงกว่า/);
  await page.locator('[name="salaryMax"]').fill('60000');
  await page.locator('#job-form [type="submit"]').click();
  const importedId = await page.locator('.job-row [data-action="open-job"]').first().getAttribute('data-id');
  await open(importedId);
  assert.equal(await page.locator('.job-description script,.job-detail img[src="x"]').count(), 0);
  assert.match(await page.locator('.jd-text').innerText(), /<script>/);
  assert.match(await page.locator('.tier-caption').innerText(), /กฎ keyword/);
  assert.equal(await page.locator('.detail-status .tier-badge').getAttribute('aria-label'), 'Tier B · ลองขยับ');
  assert.equal(await page.locator('.apply-link').getAttribute('href'), 'https://careers.example.com/apply/ui');
  assert.match(await page.locator('.job-facts').innerText(), /50,000–60,000/);
  passed('Manual import validates salary, renders JD safely, and retains location / application URL');

  const popupPromise = page.waitForEvent('popup');
  await page.locator('.apply-link').click();
  const popup = await popupPromise; await popup.waitForLoadState();
  assert.equal(popup.url(), 'https://careers.example.com/apply/ui');
  assert.equal(await page.locator('.detail-status .applied').count(), 0);
  await popup.close();
  await page.locator('[data-action="applied"]').click();
  assert.equal(await page.locator('.detail-status .applied').count(), 1);
  await close();
  await folder('saved');
  assert.equal(await page.locator(`[data-action="open-job"][data-id="${importedId}"]`).count(), 1);
  passed('Application link opens separately; status changes only on explicit manual action');

  await open(importedId);
  await page.locator('[data-action="skip"]').click();
  assert.equal(await page.locator(`[data-action="open-job"][data-id="${importedId}"]`).count(), 0);
  await page.locator('#toast [data-action="undo"]').click();
  assert.equal(await page.locator(`[data-action="open-job"][data-id="${importedId}"]`).count(), 1);
  await open(importedId); await page.locator('[data-action="skip"]').click();
  await folder('all'); await open(importedId);
  await page.locator('[data-action="skip"]').click();
  await page.reload({ waitUntil: 'networkidle' });
  await folder('all');
  assert.equal(await page.locator('.job-row').count(), 9);
  passed('Skip is reversible, retains jobs in all, and preserves imported data');

  await page.locator('[data-action="add-job"]').click();
  await page.locator('[name="title"]').fill('Visual Designer');
  await page.locator('[name="company"]').fill('Salary bounds test');
  await page.locator('#job-form [name="description"]').fill('ออกแบบ campaign visual และ key visual สำหรับงานดิจิทัลและ social media');
  await page.locator('[name="mode"]').selectOption('remote');
  await page.locator('[name="salaryMin"]').fill('30000');
  await page.locator('#job-form [type="submit"]').click();
  const boundsId = await page.locator('.job-row [data-action="open-job"]').first().getAttribute('data-id');
  await open(boundsId);
  assert.match(await page.locator('.job-facts').innerText(), /ตั้งแต่ ฿30,000/);
  assert.equal(await page.locator('.constraint-notice').count(), 0);
  await close();
  passed('A one-sided salary bound is not fabricated into a full range or rejected');

  for (const width of [390, 768, 900, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await folder('all');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `inbox overflows at ${width}`);
    await open('j3');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `detail overflows at ${width}`);
    if (width <= 900) {
      assert.equal(await page.locator('.job-detail').getAttribute('aria-modal'), 'true');
      assert.equal(await page.locator('.inbox-list').evaluate(el => el.inert), true);
    }
    await page.keyboard.press('Escape');
    await page.locator('.profile-button').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `settings overflow at ${width}`);
    await closeModal();
  }
  passed('Inbox, full-screen phone detail, and settings fit five widths with focus isolation');

  const migrationContext = await browser.newContext(); const migrationPage = await migrationContext.newPage();
  await migrationPage.addInitScript(() => localStorage.setItem('nextrole.prototype.v1', JSON.stringify({ profile: { name: 'Legacy Pun' }, saved: { j1: 'interview', j2: 'saved' }, customJobs: [{ id: 'legacy-motion', custom: true, title: 'Motion Designer', company: 'Legacy Studio', description: 'Motion and After Effects animation for digital campaigns', mode: 'remote', officeDays: 0, location: 'Thailand', salary: null, category: 'ready', readiness: 99, growth: 100, projects: [], requirements: [], reasons: [], gaps: [] }], feedback: { j1: 'yes' }, checklist: { j1: [0] } })));
  await migrationPage.goto(base, { waitUntil: 'networkidle' });
  await migrationPage.locator('[data-folder="saved"]').click();
  assert.equal(await migrationPage.locator('.job-row').count(), 2);
  await migrationPage.locator('[data-action="open-job"][data-id="j1"]').click();
  assert.equal(await migrationPage.locator('.detail-status .applied').count(), 1);
  const legacy = await migrationPage.evaluate(() => JSON.parse(localStorage.getItem('nextrole.prototype.v1')));
  assert.equal(legacy.feedback.j1, 'yes'); assert.deepEqual(legacy.checklist.j1, [0]);
  await migrationPage.keyboard.press('Escape');
  await migrationPage.locator('[data-folder="all"]').click();
  await migrationPage.locator('[data-action="open-job"][data-id="legacy-motion"]').click();
  assert.equal(await migrationPage.locator('.detail-status .tier-badge').getAttribute('aria-label'), 'Tier B · ลองขยับ');
  assert.doesNotMatch(await migrationPage.locator('.match-section').innerText(), /\/100|โอกาสเติบโต|99/);
  await migrationContext.close();
  passed('Legacy score jobs receive qualitative tiers without losing profile, saved/interview state, feedback, or checklists');

  const standalone = path.resolve('artifacts/jobu-prototype.html');
  try {
    const html = await fs.readFile(standalone, 'utf8');
    const offline = await browser.newContext(); await offline.setOffline(true);
    const op = await offline.newPage(); const requests = [];
    op.on('pageerror', e => errors.push(e.message));
    op.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await op.setContent(html, { waitUntil: 'load' });
    await op.waitForSelector('.job-row'); await op.evaluate(() => document.fonts.ready);
    assert.equal(await op.locator('.job-row').count(), 8);
    await op.locator('[data-action="open-job"][data-id="j2"]').click();
    assert.equal(await op.locator('.evidence-project img').first().evaluate(img => img.complete && img.naturalWidth > 0), true);
    assert.equal(requests.length, 0);
    await offline.close();
    passed('Standalone inbox, details, fonts, and images work offline before map opt-in');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  assert.deepEqual(errors, []);
  passed('No browser JavaScript errors across the full inbox workflow');
  console.log(`\n${checks} functional checks passed. Live Google Maps availability is not covered by the mocked provider test.`);
} finally { await context.close(); await browser.close(); }
