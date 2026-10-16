import { sleep } from 'k6';
import type { Options } from 'k6/options';
import { thresholds, visitSite } from './lib/monsters.ts';
import { saveSummary } from './lib/summary.ts';

/**
 * Smoke test: one visitor for 30 seconds. Checks the site works and is fast with no load.
 * Run: npm run perf:smoke
 */
export const options: Options = {
  vus: 1,
  duration: '30s',
  thresholds,
};

export default function () {
  visitSite();
  sleep(1);
}

export const handleSummary = saveSummary('smoke');
