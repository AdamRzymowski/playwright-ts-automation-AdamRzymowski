import * as allure from 'allure-js-commons';
import { test } from '../../fixtures/monsters';

/** Open site bugs that some tests are known to fail on (details in KNOWN-ISSUES.md). */
export const KNOWN_ISSUES = {
  'KI-004': 'Facebook button text contrast too low (4.23:1, needs 4.5:1)',
  'KI-011': 'Red error badges are hard to read (2.77:1, needs 4.5:1)',
} as const;
export type KnownIssueId = keyof typeof KNOWN_ISSUES;

const KNOWN_ISSUES_URL = 'https://github.com/AdamRzymowski/playwright-ts-automation-AdamRzymowski/blob/main/KNOWN-ISSUES.md';

/**
 * Marks the current test as an expected failure caused by an open site bug. Call it first in the test.
 * - The run stays green while the bug is there; the report shows the test as "expected to fail" with the KI.
 * - Once the bug is fixed, the test passes, and Playwright reports that as a failure ("expected to fail, but
 *   passed"). Then mark the KI fixed in KNOWN-ISSUES.md and remove the knownIssue() call.
 */
export async function knownIssue(id: KnownIssueId) {
  test.fail(true, `${id}: ${KNOWN_ISSUES[id]}`);
  test.info().annotations.push({ type: 'known issue', description: `${id}: ${KNOWN_ISSUES[id]}` });
  await allure.issue(id, KNOWN_ISSUES_URL);
}
