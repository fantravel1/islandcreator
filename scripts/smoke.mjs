import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(rootDir, 'smoke-artifacts');
const host = '127.0.0.1';
const port = 4173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function serveStatic(root, p = 4173, h = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const requestPath = req.url?.split('?')[0] ?? '/';
        const decodedPath = decodeURIComponent(requestPath);
        const candidate = decodedPath === '/' ? '/index.html' : decodedPath;
        const safePath = path.normalize(candidate).replace(/^\.\.(?:\/|\\|$)/, '');
        const fullPath = path.resolve(root, `.${safePath}`);

        if (!fullPath.startsWith(root)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        const stat = await fs.stat(fullPath).catch(() => null);
        const actualPath = stat?.isDirectory() ? path.join(fullPath, 'index.html') : fullPath;
        const data = await fs.readFile(actualPath).catch(() => null);

        if (!data) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const ext = path.extname(actualPath).toLowerCase();
        const type = MIME_TYPES[ext] ?? 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': type,
          'Cache-Control': 'no-store'
        });
        res.end(data);
      } catch (error) {
        res.writeHead(500);
        res.end(`Server error: ${error.message}`);
      }
    });

    server.on('error', reject);
    server.listen(p, h, () => resolve(server));
  });
}

function toNumber(text) {
  const parsed = Number.parseInt(String(text ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function collectStats(page) {
  return page.evaluate(() => {
    const read = (id) => {
      const el = document.getElementById(id);
      const value = Number.parseInt((el?.textContent ?? '').trim(), 10);
      return Number.isFinite(value) ? value : 0;
    };

    return {
      islands: read('stat-islands'),
      animals: read('stat-animals'),
      fish: read('stat-fish'),
      species: read('stat-species'),
      humans: read('stat-humans'),
      huts: read('stat-huts'),
      plazas: read('stat-plazas'),
      harmony: read('harmony-score')
    };
  });
}

async function waitForWorldReady(page) {
  await page.waitForSelector('#viewport canvas', { timeout: 30000 });
  await page.waitForSelector('#stat-islands', { timeout: 30000 });
  await page.waitForFunction(() => {
    const islands = Number.parseInt((document.getElementById('stat-islands')?.textContent ?? '').trim(), 10);
    return Number.isFinite(islands) && islands >= 1;
  }, { timeout: 30000 });
}

async function ensurePanelOpen(page) {
  const toggle = page.locator('#panel-toggle');
  if (!(await toggle.isVisible())) {
    return;
  }

  const collapsed = await page.evaluate(() => {
    return document.getElementById('control-panel')?.classList.contains('collapsed') ?? false;
  });

  if (collapsed) {
    await clickWithFallback(page, '#panel-toggle');
    await page.waitForTimeout(220);
  }
}

async function clickWithFallback(page, selector) {
  try {
    await page.click(selector, { timeout: 5000 });
  } catch {
    await page.evaluate((sel) => {
      const target = document.querySelector(sel);
      if (target instanceof HTMLElement) {
        target.click();
      }
    }, selector);
    await page.waitForTimeout(120);
  }
}

async function smokeScenario(browser, scenario, baseUrl) {
  const result = {
    name: scenario.name,
    passed: false,
    checks: [],
    errors: [],
    stats: null,
    screenshot: null
  };

  const context = await browser.newContext({ ...scenario.device });
  const page = await context.newPage();

  page.on('pageerror', (error) => {
    result.errors.push(`pageerror: ${error.message}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      result.errors.push(`console: ${msg.text()}`);
    }
  });

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
    await waitForWorldReady(page);

    const initialStats = await collectStats(page);
    result.checks.push(`initial islands=${initialStats.islands}`);

    const modeSculpt = page.locator('#mode-sculpt');
    const modeCamera = page.locator('#mode-camera');
    await modeSculpt.click();
    result.checks.push('entered sculpt mode');

    const canvasBox = await page.locator('#viewport canvas').boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas bounding box not available');
    }

    const startX = canvasBox.x + canvasBox.width * 0.52;
    const startY = canvasBox.y + canvasBox.height * 0.58;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 4; i += 1) {
      await page.mouse.move(startX + i * 24, startY - i * 10, { steps: 3 });
    }
    await page.mouse.up();
    result.checks.push('sculpt drag gesture executed');

    await modeCamera.click();
    result.checks.push('entered camera mode');

    await ensurePanelOpen(page);

    const panelToggle = page.locator('#panel-toggle');
    const panelClose = page.locator('#panel-close');
    if (await panelToggle.isVisible()) {
      const wasCollapsed = await page.evaluate(() => {
        return document.getElementById('control-panel')?.classList.contains('collapsed') ?? false;
      });

      if (wasCollapsed) {
        await clickWithFallback(page, '#panel-toggle');
        await page.waitForTimeout(220);
      }

      const opened = await page.evaluate(() => {
        return !(document.getElementById('control-panel')?.classList.contains('collapsed') ?? true);
      });
      if (!opened) {
        throw new Error('Panel did not open from toggle button');
      }

      await clickWithFallback(page, '#panel-close');
      await page.waitForTimeout(220);
      const collapsedAfterClose = await page.evaluate(() => {
        return document.getElementById('control-panel')?.classList.contains('collapsed') ?? false;
      });
      if (!collapsedAfterClose) {
        throw new Error('Panel close button did not collapse controls');
      }

      await clickWithFallback(page, '#panel-toggle');
      await page.waitForTimeout(220);
      await ensurePanelOpen(page);
      result.checks.push('bottom sheet open/close works');
    }

    await ensurePanelOpen(page);
    await page.click('#bring-humans');
    await page.waitForFunction(() => {
      const humans = Number.parseInt((document.getElementById('stat-humans')?.textContent ?? '').trim(), 10);
      return Number.isFinite(humans) && humans > 0;
    }, { timeout: 8000 });
    result.checks.push('human onboarding works');

    await ensurePanelOpen(page);
    const woodBeforeGather = toNumber(await page.textContent('#resource-wood'));
    await page.click('#gather-resources');
    await page.waitForFunction(
      (before) => {
        const wood = Number.parseInt((document.getElementById('resource-wood')?.textContent ?? '').trim(), 10);
        return Number.isFinite(wood) && wood > before;
      },
      woodBeforeGather,
      { timeout: 5000 }
    );
    result.checks.push('resource gather works');

    await ensurePanelOpen(page);
    const fishBeforeCare = toNumber(await page.textContent('#stat-fish'));
    await page.click('#care-animals');
    await page.waitForFunction(
      (prev) => {
        const fish = Number.parseInt((document.getElementById('stat-fish')?.textContent ?? '').trim(), 10);
        return Number.isFinite(fish) && fish >= prev;
      },
      fishBeforeCare,
      { timeout: 7000 }
    );
    result.checks.push('animal care action works');

    await ensurePanelOpen(page);
    const hutsBeforeBuild = toNumber(await page.textContent('#stat-huts'));
    await page.click('#build-hut');
    await page.waitForFunction(
      (prev) => {
        const huts = Number.parseInt((document.getElementById('stat-huts')?.textContent ?? '').trim(), 10);
        return Number.isFinite(huts) && huts > prev;
      },
      hutsBeforeBuild,
      { timeout: 7000 }
    );
    result.checks.push('hut building works');

    await ensurePanelOpen(page);
    const toolsBeforeCraft = toNumber(await page.textContent('#item-tools'));
    await page.click('#craft-tools');
    await page.waitForFunction(
      (prev) => {
        const tools = Number.parseInt((document.getElementById('item-tools')?.textContent ?? '').trim(), 10);
        return Number.isFinite(tools) && tools > prev;
      },
      toolsBeforeCraft,
      { timeout: 7000 }
    );
    result.checks.push('tool crafting works');

    const sailLocked = await page.locator('#sail-island').isDisabled();
    if (!sailLocked) {
      throw new Error('Sailing should remain locked during early village stage');
    }
    result.checks.push('sailing gate locked early');

    const finalStats = await collectStats(page);
    result.stats = finalStats;

    if (finalStats.islands < 1) {
      throw new Error(`Expected at least 1 island, got ${finalStats.islands}`);
    }
    if (finalStats.animals < 1) {
      throw new Error('Expected at least 1 animal');
    }
    if (finalStats.fish < 1) {
      throw new Error('Expected at least 1 fish');
    }
    if (finalStats.species < 1) {
      throw new Error('Expected at least 1 wildlife species');
    }
    if (finalStats.humans < 1) {
      throw new Error('Expected at least 1 human after onboarding');
    }
    if (finalStats.huts < 1) {
      throw new Error('Expected at least 1 hut after onboarding');
    }
    if (finalStats.plazas < 0) {
      throw new Error('Plaza count should never be negative');
    }
    if (finalStats.harmony < 0 || finalStats.harmony > 100) {
      throw new Error(`Harmony out of range: ${finalStats.harmony}`);
    }

    const errorBlacklist = result.errors.filter(
      (entry) => !entry.includes('favicon') && !entry.includes('ERR_ABORTED')
    );

    if (errorBlacklist.length) {
      throw new Error(`Runtime errors detected: ${errorBlacklist.slice(0, 3).join(' | ')}`);
    }

    const screenshotPath = path.resolve(artifactsDir, `${scenario.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    result.screenshot = screenshotPath;
    result.passed = true;
  } catch (error) {
    result.errors.push(error.message);
    try {
      const failPath = path.resolve(artifactsDir, `${scenario.name}-failed.png`);
      await page.screenshot({ path: failPath, fullPage: true });
      result.screenshot = failPath;
    } catch {
      // Ignore follow-up screenshot failures.
    }
  } finally {
    await context.close();
  }

  return result;
}

async function main() {
  await fs.mkdir(artifactsDir, { recursive: true });

  const server = await serveStatic(rootDir, port, host);
  const baseUrl = `http://${host}:${port}`;

  const scenarios = [
    { name: 'iphone-13', device: devices['iPhone 13'] },
    { name: 'pixel-7', device: devices['Pixel 7'] },
    { name: 'ipad-mini', device: devices['iPad Mini'] },
    {
      name: 'desktop-1440',
      device: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    }
  ];

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-vulkan']
  });

  const results = [];
  try {
    for (const scenario of scenarios) {
      const scenarioResult = await smokeScenario(browser, scenario, baseUrl);
      results.push(scenarioResult);
      const prefix = scenarioResult.passed ? 'PASS' : 'FAIL';
      console.log(`${prefix} ${scenarioResult.name}`);
      if (scenarioResult.stats) {
        console.log(`  stats: ${JSON.stringify(scenarioResult.stats)}`);
      }
      if (scenarioResult.checks.length) {
        console.log(`  checks: ${scenarioResult.checks.join(' | ')}`);
      }
      if (scenarioResult.errors.length) {
        console.log(`  errors: ${scenarioResult.errors.join(' || ')}`);
      }
      if (scenarioResult.screenshot) {
        console.log(`  screenshot: ${scenarioResult.screenshot}`);
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const failed = results.filter((r) => !r.passed);
  const summaryPath = path.resolve(artifactsDir, 'smoke-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  console.log(`\nSummary written to ${summaryPath}`);
  if (failed.length) {
    console.error(`Smoke test failed for ${failed.length} scenario(s).`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
