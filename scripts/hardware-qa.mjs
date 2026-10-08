import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
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
await new Promise(resolve => server.listen(5183, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:5183';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
  args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const errors = [], checks = [], captures = [];
const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
async function angle(name, value) {
  await page.getByRole('slider', { name, exact: true }).evaluate((input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function capture(name) {
  const canvas = page.locator('dialog[open] .detail-canvas canvas');
  await canvas.waitFor(); await page.evaluate(() => document.fonts.ready);
  const data = await canvas.screenshot({ type: 'jpeg', quality: 85 });
  await writeFile(path.join(output, name + '.jpg'), data);
  const chunkDir = path.join(output, '.parts-' + name); await rm(chunkDir, { recursive: true, force: true }); await mkdir(chunkDir, { recursive: true });
  for (let offset = 0, part = 0; offset < data.length; offset += 1500, part++) await writeFile(path.join(chunkDir, String(part)), data.subarray(offset, offset + 1500));
  captures.push({ name, bytes: data.length, parts: Math.ceil(data.length / 1500) });
}
try {
  for (const [number, id, title, mode] of [[4, 'invisible', 'Invisible 42', 'avers'], [5, 'reverse', 'Reverse Premium 59', 'revers']]) {
    await page.goto(base + '/?page=' + number);
    await page.waitForSelector('[data-testid="scene-' + id + '"] canvas');
    for (const hand of ['left', 'right']) {
      if (await page.getByTestId('scene-' + id).getAttribute('data-hinge') !== hand) await page.getByRole('button', { name: 'Поменять сторону петель' }).click();
      await page.waitForSelector('[data-testid="scene-' + id + '"] canvas');
      const gold = mode === 'revers' ? 'GOLD BRASH' : 'GOLD';
      for (const profile of hand === 'left' ? ['ALU BLACK', gold] : [gold]) {
        await page.getByRole('button', { name: profile, exact: true }).click();
        await page.getByRole('button', { name: 'Посмотреть замок' }).click();
        await capture('hardware-' + mode + '-lock-' + hand + '-' + profile.replaceAll(' ', '-').toLowerCase());
        await page.getByRole('button', { name: 'Ручка', exact: true }).last().click();
        assert.equal(await page.getByRole('button', { name: 'Ручка', exact: true }).last().getAttribute('aria-pressed'), 'true');
        if (profile === gold) await capture('hardware-' + mode + '-handle-' + hand);
        await page.getByRole('button', { name: 'Кромка', exact: true }).last().click();
        if (hand === 'left') await capture('hardware-' + mode + '-edge-' + profile.replaceAll(' ', '-').toLowerCase());
        for (const degrees of [0, 60, 85]) await angle('Угол двери в увеличенном просмотре', degrees);
        await page.keyboard.press('Escape');
        checks.push(mode + ' ' + hand + ' ' + profile + ': lock/handle/edge, angles 0/60/85');
      }
    }
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  const fallback = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); }; });
  const plain = await fallback.newPage();
  await plain.goto(base + '/?page=4'); await plain.waitForSelector('.scene-status');
  await plain.getByRole('button', { name: 'GOLD', exact: true }).click();
  assert.equal(await plain.locator('.scene-fallback svg polygon').last().getAttribute('fill'), '#ba975d');
  await plain.getByRole('button', { name: 'Посмотреть замок' }).click();
  assert.equal(await plain.locator('dialog[open] svg rect[rx="7"]').count(), 1);
  await plain.getByRole('button', { name: 'Ручка', exact: true }).last().click();
  assert.equal(await plain.getByRole('button', { name: 'Ручка', exact: true }).last().getAttribute('aria-pressed'), 'true');
  await plain.keyboard.press('Escape'); await fallback.close();
  checks.push('Fallback: selected edge colour, detailed lock and handle, tab switching');
  await writeFile(path.join(output, 'hardware-results.json'), JSON.stringify({date: new Date().toISOString(), browser: await browser.version(), checks, captures, errors}, null, 2));
  console.log(JSON.stringify({ checks: checks.length, errors, captures }));
} finally { await context.close(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
