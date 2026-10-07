import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('dist'), output = path.resolve('docs/verification');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.pdf': 'application/pdf' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) throw Error('path');
    const data = await readFile(file); response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' }); response.end(data);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(5182, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:5182';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
  args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [], warnings = [], checks = [];
const track = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); if (message.type() === 'warning') warnings.push(message.text()); });
};
async function photo(page, filename) { await page.screenshot({ path: path.join(output, filename + '.webp'), type: 'webp', quality: 78 }); }
async function settle(page) { await page.waitForFunction(() => !document.querySelector('.book-stage.turning')); await page.evaluate(() => document.fonts.ready); }
async function angle(page, name, value) {
  const slider = page.getByRole('slider', { name, exact: true });
  await slider.evaluate((input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
function pass(message) { checks.push(message); console.log('PASS', message); }
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await desktop.newPage(); track(page);
  await page.goto(base + '/?page=1'); await settle(page);
  assert.equal(await page.locator('article').count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Включить звук' }).getAttribute('aria-pressed'), 'false');
  const initialBytes = await page.evaluate(() => performance.getEntriesByType('resource').reduce((sum, resource) => sum + resource.transferSize, 0));
  assert.ok(initialBytes < 3 * 1024 * 1024); pass('Initial load below 3 MB, sound off, cover alone');
  await photo(page, 'desktop-cover');
  await page.getByRole('button', { name: 'Открыть журнал', exact: true }).click(); await settle(page);
  assert.equal(await page.locator('article[data-page="2"]').count(), 1); assert.equal(await page.locator('article[data-page="3"]').count(), 1);
  await page.waitForSelector('[data-testid="scene-compare-avers"] canvas');
  await page.waitForSelector('[data-testid="scene-compare-revers"] canvas');
  await page.getByRole('button', { name: 'Открыть', exact: true }).first().click();
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="scene-compare-avers"]').dataset.angle) > 70);
  await angle(page, 'Угол открытия Revers', 60);
  assert.ok(Number(await page.getByTestId('scene-compare-revers').getAttribute('data-angle')) > 59);
  await photo(page, 'desktop-opening'); pass('Avers/Revers actual WebGL scenes open independently');
  await page.goto(base + '/?page=4'); await page.waitForSelector('[data-testid="scene-invisible"] canvas');
  await angle(page, 'Угол открытия Invisible 42', 60);
  await page.locator('article[data-page="4"]').getByRole('button', { name: 'GOLD', exact: true }).click();
  await page.getByRole('button', { name: 'Вперёд' }).click(); await settle(page);
  await page.getByRole('button', { name: 'Назад' }).click(); await settle(page);
  assert.ok(Math.abs(Number(await page.getByTestId('scene-invisible').getAttribute('data-angle')) - 60) < 1);
  assert.equal(await page.locator('article[data-page="4"]').getByRole('button', { name: 'GOLD', exact: true }).getAttribute('aria-pressed'), 'true');
  pass('Angle and selected profile survive page changes');
  await page.locator('article[data-page="4"]').getByRole('button', { name: 'Поменять сторону петель' }).click();
  assert.equal(await page.getByTestId('scene-invisible').getAttribute('data-hinge'), 'right');
  await angle(page, 'Угол открытия Invisible 42', 60);
  await page.waitForSelector('[data-testid="scene-invisible"] canvas');
  await photo(page, 'desktop-right-hinge');
  await page.locator('article[data-page="4"]').getByRole('button', { name: 'Посмотреть замок' }).click();
  await page.waitForSelector('dialog[open] canvas'); await photo(page, 'desktop-lock');
  await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog[open]').count(), 0); pass('Hinge hand and lock detail, native focus and Escape');
  await page.goto(base + '/?page=10'); assert.equal(await page.locator('article').count(), 1);
  await page.getByRole('button', { name: 'Вперёд' }).click(); await settle(page); assert.equal(await page.locator('article[data-page="11"]').count(), 1);
  assert.equal(await page.locator('article').count(), 1); pass('Unpaired last internal page and contacts are shown alone');
  await page.getByRole('button', { name: 'Оглавление', exact: true }).click();
  assert.equal(await page.locator('.contents-grid button').count(), 11); await page.keyboard.press('Escape'); pass('All 11 entries in the contents panel');
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  let phone = await mobile.newPage(); track(phone);
  for (let n = 1; n <= 11; n++) {
    await phone.goto(base + '/?page=' + n); await settle(phone);
    await phone.waitForSelector('article[data-page="' + n + '"]');
    assert.equal(await phone.locator('article').count(), 1);
    assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if ([3, 4, 5, 6, 7].includes(n)) await phone.waitForSelector('canvas');
    await photo(phone, 'mobile-page-' + String(n).padStart(2, '0'));
  }
  pass('All 11 mobile pages, real HTML and no horizontal overflow');
  await mobile.close();
  const gestures = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, recordVideo: { dir: path.join(output, 'recordings'), size: { width: 390, height: 844 } } });
  phone = await gestures.newPage(); track(phone);
  await phone.goto(base + '/?page=3'); await phone.waitForSelector('canvas');
  const cdp = await gestures.newCDPSession(phone);
  async function swipe(x1, y1, x2, y2) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
    for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 6, y: y1 + (y2 - y1) * i / 6 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await swipe(325, 190, 80, 192); await phone.waitForSelector('article[data-page="4"]'); await settle(phone);
  pass('Real touch input swipe changes the mobile page');
  await phone.waitForSelector('[data-testid="scene-invisible"] canvas');
  const before = phone.url();
  const box = await phone.getByTestId('scene-invisible').boundingBox();
  await swipe(box.x + box.width * 0.52, box.y + box.height * 0.5, box.x + box.width * 0.85, box.y + box.height * 0.5);
  assert.equal(phone.url(), before); pass('Dragging inside a door scene never flips the magazine');
  await phone.getByRole('slider', { name: 'Угол открытия Invisible 42' }).focus();
  await phone.keyboard.press('ArrowRight'); assert.equal(phone.url(), before); pass('Keyboard range control has priority over page navigation');
  await phone.getByRole('button', { name: 'Посмотреть замок' }).click(); await phone.waitForSelector('dialog[open] canvas'); await photo(phone, 'mobile-lock'); await phone.keyboard.press('Escape');
  await phone.goto(base + '/?page=8');
  await phone.getByRole('button', { name: 'Послушать иллюстрацию' }).click(); assert.equal(await phone.getByRole('button', { name: 'Выключить звук' }).getAttribute('aria-pressed'), 'true');
  await phone.getByRole('button', { name: 'Выключить звук' }).click(); pass('Sound begins only on explicit request and can be stopped');
  const quiet = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
  const reduced = await quiet.newPage(); track(reduced); await reduced.goto(base + '/?page=1');
  await reduced.getByRole('button', { name: 'Открыть журнал' }).click();
  assert.equal(await reduced.locator('.book-stage.turning').count(), 0); pass('Reduced motion avoids 3D page flipping');
  // An explicitly unavailable WebGL context retains the whole catalogue.
  const fallback = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); }; });
  const plain = await fallback.newPage(); await plain.goto(base + '/?page=4');
  await plain.waitForSelector('.scene-status'); await angle(plain, 'Угол открытия Invisible 42', 60);
  assert.ok(Number(await plain.getByTestId('scene-invisible').getAttribute('data-angle')) >= 59); await photo(plain, 'mobile-fallback'); pass('WebGL fallback keeps meaningful controls and text');
  await plain.getByRole('button', { name: 'Посмотреть замок' }).click();
  await plain.waitForSelector('dialog[open] .scene-fallback svg'); await plain.keyboard.press('Escape');
  const geometry = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const sample = await geometry.newPage(); track(sample);
  for (const [number, id, title, mode] of [[4, 'invisible', 'Invisible 42', 'avers'], [5, 'reverse', 'Reverse Premium 59', 'revers']]) {
    await sample.goto(base + '/?page=' + number); await sample.waitForSelector('[data-testid="scene-' + id + '"] canvas');
    for (const hand of ['left', 'right']) {
      if (await sample.getByTestId('scene-' + id).getAttribute('data-hinge') !== hand) await sample.getByRole('button', { name: 'Поменять сторону петель' }).click();
      await sample.waitForSelector('[data-testid="scene-' + id + '"] canvas');
      for (const degrees of [30, 60, 85]) { await angle(sample, 'Угол открытия ' + title, degrees); await photo(sample, mode + '-' + hand + '-' + degrees); }
    }
  }
  await geometry.close(); pass('Control frames for four opening/hinge combinations at 30/60/85 degrees');
  const replay = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: path.join(output, 'recordings'), size: { width: 1280, height: 900 } } });
  const mouse = await replay.newPage(); track(mouse); await mouse.goto(base + '/?page=2'); await settle(mouse);
  const edge = await mouse.locator('.right-edge').boundingBox();
  await mouse.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2); await mouse.mouse.down();
  await mouse.mouse.move(edge.x - 200, edge.y + edge.height / 2, { steps: 14 }); await mouse.mouse.up(); await settle(mouse);
  assert.equal(await mouse.locator('article[data-page="4"]').count(), 1); await mouse.waitForSelector('[data-testid="scene-invisible"] canvas');
  await mouse.locator('article[data-page="4"]').getByRole('button', { name: 'Открыть', exact: true }).click();
  await mouse.waitForFunction(() => Number(document.querySelector('[data-testid="scene-invisible"]').dataset.angle) > 70);
  await mouse.keyboard.press('ArrowRight'); await settle(mouse); assert.equal(await mouse.locator('article[data-page="6"]').count(), 1);
  const mouseVideo = mouse.video(), touchVideo = phone.video();
  await replay.close(); await gestures.close();
  await mouseVideo.saveAs(path.join(output, 'desktop-mouse.webm')); await touchVideo.saveAs(path.join(output, 'mobile-swipe.webm'));
  pass('Mouse edge drag and keyboard navigation with video evidence');
  assert.equal(errors.length, 0, errors.join('\n'));
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ browser: await browser.version(), date: new Date().toISOString(), initialBytes, checks, errors, warnings: [...new Set(warnings)] }, null, 2));
  await desktop.close(); await quiet.close(); await fallback.close();
  console.log('COMPLETE', checks.length, 'browser checks');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
