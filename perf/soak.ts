import { browser, type Page } from 'k6/browser';
import { check } from 'k6';
import exec from 'k6/execution';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL } from './lib/monsters.ts';
import { saveSummary } from './lib/summary.ts';

/**
 * Soak test: 15 visitors click around the site in real (headless) Chromium for 15 minutes, to see whether
 * the site stays fast and working when it's used for a long time. Each visitor goes round and round:
 *   1. Open the home page
 *   2. Click "Gallery" in the menu
 *   3. Click every gallery tab (and the Miniatures / Terrain sub-tabs) in random order
 *   4. Open a random photo, then close it with Escape
 *   5. Click two random menu links (Services, How it works, About)
 *   6. Sometimes (1 in 3) switch to Polish
 * Read-only: never sends the request form and never opens Facebook.
 *
 * Only our own site is loaded. Google Fonts is blocked by the npm script (K6_BROWSER_ARGS), and every visit
 * checks that nothing came from another site; if something did, the test stops at once.
 *
 * Run (ask the owner first, it takes 15 minutes and starts 15 browsers): npm run perf:soak
 * Shorter or smaller: npm run perf:soak -- -e SOAK_USERS=2 -e SOAK_DURATION=1m
 */
export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: Number(__ENV.SOAK_USERS || 15),
      duration: __ENV.SOAK_DURATION || '15m',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    // Almost every check passes (a long run may hit the odd hiccup, but not more than 1%).
    checks: ['rate>0.99'],
    // Core Web Vitals, "good" level for 75% of page loads.
    browser_web_vital_lcp: ['p(75)<2500'],
    browser_web_vital_cls: ['p(75)<0.1'],
    // Clicks feel instant: a gallery tab shows its photos, a photo opens.
    tab_switch: ['p(95)<500'],
    // Includes downloading the full-size photo, so it depends on the tester's connection (as in load.ts).
    photo_open: ['p(95)<3000'],
    // Never anything from another site.
    third_party_loads: ['count==0'],
  },
};

/** Click to gallery shown. */
const tabSwitch = new Trend('tab_switch', true);
/** Click on a photo to the enlarged photo fully loaded. */
const photoOpen = new Trend('photo_open', true);
/** Files loaded from any site other than ours (must stay 0). */
const thirdPartyLoads = new Counter('third_party_loads');

const TABS = ['resin', 'fdm', 'design', 'painting'];
const SUBTABS = ['miniatures', 'terrain'];
const NAV = ['services', 'how', 'about'];

const byTestId = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`);
const think = (page: Page) => page.waitForTimeout(1000 + Math.random() * 2000); // a visitor looks for 1-3 s
const shuffle = <T>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export default async function () {
  const page = await browser.newPage();
  try {
    // 1. Open the home page
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
    // script.js writes the version into the footer; after that the clicks work.
    await page.waitForFunction(() => !!document.getElementById('site-version')?.textContent, { timeout: 15_000 });
    check(await byTestId(page, 'hero-title').isVisible(), { '1. home page shows the title': (v) => v });
    await guardOwnSiteOnly(page);
    await think(page);

    // 2. Click "Gallery" in the menu
    await byTestId(page, 'nav-gallery').click();
    await page.waitForFunction(() => location.hash === '#gallery');
    check(await byTestId(page, 'gallery-tabs').isVisible(), { '2. gallery tabs are shown': (v) => v });
    await think(page);

    // 3. Click every gallery tab, then the sub-tabs, in random order
    for (const tab of shuffle(TABS)) await openTab(page, `gallery-tab-${tab}`, tab === 'painting' ? null : tab);
    for (const sub of shuffle(SUBTABS)) await openTab(page, `gallery-subtab-${sub}`, sub);

    // 4. Open a random photo of the visible gallery, then close it with Escape
    const photo: string | null = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.gallery:not([hidden]) .gallery-item')];
      return items.length ? items[Math.floor(Math.random() * items.length)].getAttribute('data-testid') : null;
    });
    if (photo) {
      const started = Date.now();
      await byTestId(page, photo).click();
      const opened = await page
        .waitForFunction(() => {
          const img = document.querySelector<HTMLImageElement>('[data-testid="lightbox-image"]');
          return !document.querySelector('[data-testid="lightbox"]')?.hasAttribute('hidden') && !!img?.complete && img.naturalWidth > 0;
        }, { timeout: 10_000 })
        .then(() => true, () => false);
      if (opened) photoOpen.add(Date.now() - started);
      check(opened, { '4. photo opens enlarged': (v) => v });
      await think(page);
      await page.keyboard.press('Escape');
      check(await byTestId(page, 'lightbox').isHidden(), { '4. Escape closes the photo': (v) => v });
    }

    // 5. Click two random menu links
    for (const section of shuffle(NAV).slice(0, 2)) {
      await byTestId(page, `nav-${section}`).click();
      const reached = await page.waitForFunction((h: string) => location.hash === h, { timeout: 5_000 }, `#${section}`).then(() => true, () => false);
      check(reached, { [`5. menu link "${section}" works`]: (v) => v });
      await think(page);
    }

    // 6. Sometimes switch to Polish
    if (Math.random() < 1 / 3) {
      await Promise.all([page.waitForNavigation(), byTestId(page, 'lang-pl').click()]);
      check(await page.evaluate(() => document.documentElement.lang), { '6. Polish page opens': (lang) => lang === 'pl' });
      await guardOwnSiteOnly(page);
      await think(page);
    }
    check(true, { '0. visit completed without errors': (v) => v });
  } catch (error) {
    // A crash (timeout, script error) must fail the run, not silently skip the remaining steps.
    console.error(`Visit stopped: ${error}`);
    check(false, { '0. visit completed without errors': (v) => v });
  } finally {
    await page.close();
  }
}

/** Clicks a gallery tab and times how long until its gallery is shown. */
async function openTab(page: Page, testId: string, gallery: string | null) {
  const started = Date.now();
  await byTestId(page, testId).click();
  // Poll with evaluate. No template strings inside page functions: k6 1.1 fails on them
  // ("SyntaxError: Unexpected end of input").
  let shown = false;
  while (!shown && Date.now() - started < 5_000) {
    shown = await page.evaluate((a: string[]) => {
      const tab = document.querySelector('[data-testid="' + a[0] + '"]');
      const shownGallery = a[1] ? document.querySelector('.gallery[data-gallery="' + a[1] + '"]') : null;
      return !!tab && tab.classList.contains('active') && (!a[1] || (!!shownGallery && !shownGallery.hasAttribute('hidden')));
    }, [testId, gallery ?? '']);
    if (!shown) await page.waitForTimeout(25);
  }
  if (shown) tabSwitch.add(Date.now() - started);
  check(shown, { [`3. tab "${testId.replace(/^gallery-(sub)?tab-/, '')}" shows its photos`]: (v) => v });
  await think(page);
}

/**
 * Makes sure the page loaded nothing from other sites (Google Fonts is blocked by K6_BROWSER_ARGS).
 * If anything got through, stop the whole test so no more traffic goes to third parties.
 */
async function guardOwnSiteOnly(page: Page) {
  const foreign: string[] = await page.evaluate(async () => {
    await document.fonts.ready;
    const fromOthers = performance
      .getEntriesByType('resource')
      .map((e) => e as PerformanceResourceTiming)
      .filter((e) => new URL(e.name).origin !== location.origin)
      .filter((e) => (e.responseStatus ?? 0) > 0 || e.transferSize > 0 || e.decodedBodySize > 0)
      .map((e) => e.name);
    // Cross-origin timings can hide sizes, so also check the web font itself.
    if ([...document.fonts].some((f) => f.family.includes('Pirata') && f.status === 'loaded')) fromOthers.push('Google Fonts (Pirata One loaded)');
    return fromOthers;
  });
  thirdPartyLoads.add(foreign.length);
  if (foreign.length) {
    exec.test.abort(`Third-party files were loaded (${foreign.join(', ')}). Run through "npm run perf:soak", which blocks them.`);
  }
}

export const handleSummary = saveSummary('soak');
