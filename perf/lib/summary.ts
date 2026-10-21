// @ts-ignore - remote k6 jslib module, resolved by k6 at run time
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { BASE_URL } from './monsters.ts';
import { performanceReport } from './report.ts';

/**
 * Prints the usual console summary followed by the plain-language performance report, and saves
 * reports/k6-<name>-summary.txt|json and reports/k6-<name>-report.md.
 */
export function saveSummary(name: string) {
  return (data: any) => {
    const report = performanceReport(name, data, BASE_URL);
    return {
      stdout: `${textSummary(data, { indent: ' ', enableColors: true })}\n\n${report}\n`,
      [`reports/k6-${name}-summary.txt`]: textSummary(data, { indent: ' ', enableColors: false }),
      [`reports/k6-${name}-summary.json`]: JSON.stringify(data, null, 2),
      [`reports/k6-${name}-report.md`]: report,
    };
  };
}
