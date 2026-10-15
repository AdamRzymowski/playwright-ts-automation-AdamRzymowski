import { rmSync } from 'node:fs';

/** Start every run with empty Allure results so the report shows only this run.
 *  Trend history lives in allure-history/ and is kept. */
export default function globalSetup() {
  rmSync('allure-results', { recursive: true, force: true });
}
