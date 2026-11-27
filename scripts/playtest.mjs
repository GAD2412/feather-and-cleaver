import { spawn } from 'node:child_process';
import { mkdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/vutruonggiang/.local/lib/node_modules/@playwright/mcp/node_modules/playwright/index.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const shotsDir = join(root, 'screenshots');
mkdirSync(shotsDir, { recursive: true });

const PORT = 18127;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function assert(cond, msg) {
  if (!cond) throw new Error(`Playtest assertion failed: ${msg}`);
}

async function run() {
  const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server start timeout')), 5000);
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes('serving game/')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on('data', (chunk) => {
      console.error('[serve.ts]', String(chunk));
    });
  });

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    const errors = [];
    const externalUrls = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith(BASE_URL) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalUrls.push(url);
      }
    });

    // 1. Verify Title Screen + interactive Start + Keyboard & Mouse playtest.
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    let snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.state === 'TITLE', `Expected TITLE, got ${snap.state}`);

    // Capture Title screenshot (02-title.jpg).
    const canvas = page.locator('#game-canvas');
    await canvas.screenshot({ path: join(shotsDir, '02-title.jpg'), type: 'jpeg', quality: 92 });

    // Start via Start button click (center at ~1015, 586 in 1280x720 canvas).
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + (1015 / 1280) * box.width, box.y + (586 / 720) * box.height);
    await page.waitForTimeout(150);
    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.state === 'PLAYING', `Expected PLAYING after Start click, got ${snap.state}`);

    const startX = snap.turkeyX;
    // Keyboard movement + dash + decoy + mute + pause/resume.
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(220);
    await page.keyboard.press('Space');
    await page.waitForTimeout(220);
    await page.keyboard.up('KeyD');
    await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.45);
    await page.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.45, { button: 'right' });
    await page.waitForTimeout(150);

    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.turkeyX > startX + 30, `Expected turkey to move right from ${startX}, got ${snap.turkeyX}`);

    await page.keyboard.press('KeyM');
    await page.waitForTimeout(60);
    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.muted === true, 'Expected mute toggle ON');
    await page.keyboard.press('KeyM');

    await page.keyboard.press('KeyP');
    await page.waitForTimeout(60);
    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.state === 'PAUSED', 'Expected PAUSED after KeyP');
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(60);
    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.state === 'PLAYING', 'Expected PLAYING after second KeyP');

    // 2. Test Perk select interaction (?shot=perk -> Digit1 -> PLAYING stage 2).
    await page.goto(`${BASE_URL}/?shot=perk&seed=7`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.state === 'PERK_SELECT', `Expected PERK_SELECT, got ${snap.state}`);
    await page.keyboard.press('Digit1');
    await page.waitForTimeout(150);
    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.state === 'PLAYING' && snap.stageIndex === 2, `Expected Stage 2 PLAYING after perk, got ${JSON.stringify(snap)}`);

    // 3. Test Caught & Escaped end screens + Restart loop.
    await page.goto(`${BASE_URL}/?shot=caught&seed=11`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.state === 'CAUGHT', `Expected CAUGHT, got ${snap.state}`);
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(150);
    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.state === 'PLAYING' && snap.score === 0 && snap.lives === 3, 'Expected clean restart from CAUGHT');

    // 4. Capture dynamic cover screenshot (Porch/Action chase), Kitchen climax, and Escaped End screen.
    await page.goto(`${BASE_URL}/?shot=cover&seed=42`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(120);
    await canvas.screenshot({ path: join(shotsDir, '01-cover.jpg'), type: 'jpeg', quality: 92 });

    await page.goto(`${BASE_URL}/?shot=kitchen&seed=99`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(120);
    await canvas.screenshot({ path: join(shotsDir, '03-kitchen.jpg'), type: 'jpeg', quality: 92 });

    await page.goto(`${BASE_URL}/?shot=escaped&seed=77`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(120);
    await canvas.screenshot({ path: join(shotsDir, '04-end-screen.jpg'), type: 'jpeg', quality: 92 });

    // Click Play Again button on Escaped end screen (~640, 543).
    const endBox = await canvas.boundingBox();
    await page.mouse.click(endBox.x + (640 / 1280) * endBox.width, endBox.y + (543 / 720) * endBox.height);
    await page.waitForTimeout(150);
    snap = await page.evaluate(() => window.__TURKEY_GAME__.getState());
    assert(snap.state === 'PLAYING' && snap.score === 0, 'Expected clean restart from ESCAPED button click');

    assert(errors.length === 0, `Browser errors found:\n${errors.join('\n')}`);
    assert(externalUrls.length === 0, `External network requests made:\n${externalUrls.join('\n')}`);

    // Clean any stale non-target files in screenshots/ and report exact sizes.
    for (const file of ['01-cover.jpg', '02-title.jpg', '03-kitchen.jpg', '04-end-screen.jpg']) {
      const size = statSync(join(shotsDir, file)).size;
      assert(size <= 262144, `Screenshot ${file} exceeds 256 KiB (${size} bytes)`);
      console.log(`Screenshot ${file}: ${size} bytes (OK)`);
    }
    try {
      unlinkSync(join(shotsDir, '.DS_Store'));
    } catch {}

    console.log('ALL PLAYTEST ASSERTIONS PASSED (0 errors, 0 external requests).');
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
