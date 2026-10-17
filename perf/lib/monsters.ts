import http from 'k6/http';
import { check, group } from 'k6';
import { Trend } from 'k6/metrics';

/** Site under test; override with: k6 run -e MONSTERS_URL=https://... perf/smoke.ts */
export const BASE_URL = (__ENV.MONSTERS_URL || 'https://substandard-monsters.netlify.app').replace(/\/$/, '');

/** Time to first byte of the HTML pages only (assets excluded), to watch server/CDN speed. */
export const pageTtfb = new Trend('page_ttfb', true);

/** Tags each request with a readable name and its type (page or asset) for per-type limits. */
const params = (name: string) => ({ tags: { name, type: name.startsWith('page') ? 'page' : 'asset' } });

/**
 * One visitor's journey: English page with its CSS, JS and a few photos, then the Polish page.
 * Read-only: never posts the request form (that would email the site owner).
 */
export function visitSite() {
  group('English page', () => {
    const res = http.get(`${BASE_URL}/`, params('page: /'));
    pageTtfb.add(res.timings.waiting);
    check(res, {
      'home: status 200': (r) => r.status === 200,
      'home: has the hero title': (r) => String(r.body).includes('Monstrously good prints'),
      'home: has the request form': (r) => String(r.body).includes('data-testid="request-form"'),
    });

    // The browser loads these in parallel right after the HTML.
    const assets = http.batch([
      ['GET', `${BASE_URL}/style.css`, null, params('asset: style.css')],
      ['GET', `${BASE_URL}/script.js`, null, params('asset: script.js')],
      ['GET', `${BASE_URL}/images/logo.webp`, null, params('asset: logo.webp')],
      ['GET', `${BASE_URL}/images/mini-1.webp`, null, params('asset: gallery photo')],
      ['GET', `${BASE_URL}/images/terrain-1.webp`, null, params('asset: gallery photo')],
    ]);
    for (const a of assets) {
      check(a, { 'asset: status 200': (r) => r.status === 200 });
    }
  });

  group('Polish page', () => {
    // pl.html works locally and on Netlify (which also serves the tidy /pl).
    const res = http.get(`${BASE_URL}/pl.html`, params('page: /pl'));
    pageTtfb.add(res.timings.waiting);
    check(res, {
      'pl: status 200': (r) => r.status === 200,
      'pl: is in Polish': (r) => String(r.body).includes('lang="pl"'),
    });
  });
}

/** Shared pass/fail rules (k6 exits with an error when one is broken). */
export const thresholds = {
  // Fewer than 1% of requests may fail.
  http_req_failed: ['rate<0.01'],
  // 95% of HTML pages fully load within 1 s.
  'http_req_duration{type:page}': ['p(95)<1000'],
  // 95% of CSS/JS/photos within 2 s (large photos depend on the tester's own connection speed).
  'http_req_duration{type:asset}': ['p(95)<2000'],
  // HTML pages start arriving within 600 ms for 95% of visits.
  page_ttfb: ['p(95)<600'],
  // Every content check must pass.
  checks: ['rate==1.0'],
};
