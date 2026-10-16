// @ts-ignore - remote k6 jslib module, resolved by k6 at run time
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

/** Prints the usual console summary and saves it as text + JSON under reports/. */
export function saveSummary(name: string) {
  return (data: unknown) => ({
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [`reports/k6-${name}-summary.txt`]: textSummary(data, { indent: ' ', enableColors: false }),
    [`reports/k6-${name}-summary.json`]: JSON.stringify(data, null, 2),
  });
}
