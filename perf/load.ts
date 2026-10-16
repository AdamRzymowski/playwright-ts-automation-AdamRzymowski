import { sleep } from 'k6';
import type { Options } from 'k6/options';
import { thresholds, visitSite } from './lib/monsters.ts';
import { saveSummary } from './lib/summary.ts';

/**
 * Load test: ramps up to 10 visitors browsing at the same time, holds, then ramps down (~2.5 min).
 * Deliberately small: the site is on Netlify's free plan. Raise the targets only for your own servers.
 * Run: npm run perf:load
 */
export const options: Options = {
  stages: [
    { duration: '30s', target: 5 }, // warm up
    { duration: '30s', target: 10 }, // ramp to peak
    { duration: '1m', target: 10 }, // hold peak
    { duration: '30s', target: 0 }, // ramp down
  ],
  thresholds: {
    ...thresholds,
    // Under load, allow a little more time than the smoke test.
    http_req_duration: ['p(95)<1500'],
    page_ttfb: ['p(95)<800'],
  },
};

export default function () {
  visitSite();
  // A real visitor reads the page for a few seconds before moving on.
  sleep(2 + Math.random() * 3);
}

export const handleSummary = saveSummary('load');
