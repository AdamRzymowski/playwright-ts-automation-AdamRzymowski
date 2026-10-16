import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import * as allure from 'allure-js-commons';

/** WCAG 2.0, 2.1 and 2.2 at levels A and AA: the level most accessibility laws refer to. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
export type Violation = AxeResults['violations'][number];

/**
 * Runs an axe-core WCAG scan of the page as it is right now (or only `include`),
 * attaches the full results and a readable summary to the report, and returns the violations.
 */
export async function scanWcag(
  page: Page,
  name: string,
  options: { include?: string; exclude?: string[] } = {},
): Promise<Violation[]> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (options.include) builder = builder.include(options.include);
  for (const sel of options.exclude ?? []) builder = builder.exclude(sel);
  const results = await builder.analyze();

  await allure.attachment(`axe ${name} - summary.txt`, summarize(results), 'text/plain');
  await allure.attachment(`axe ${name} - full.json`, JSON.stringify(results, null, 2), 'application/json');
  return results.violations;
}

/** One line per broken rule plus up to 3 example elements, for readable failure messages. */
export function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) return 'No WCAG violations';
  return violations
    .map((v) => {
      const wcag = v.tags.filter((t) => /^wcag\d{3,}$/.test(t)).map(toCriterion).join(', ');
      const examples = v.nodes
        .slice(0, 3)
        .map((n) => `      - ${n.target.join(' ')}${n.failureSummary ? `: ${n.failureSummary.split('\n')[1]?.trim() ?? ''}` : ''}`)
        .join('\n');
      return `  [${v.impact}] ${v.id} (WCAG ${wcag || 'best practice'}) - ${v.help}, ${v.nodes.length} element(s)\n${examples}\n      ${v.helpUrl}`;
    })
    .join('\n');
}

function summarize(results: AxeResults): string {
  return [
    `URL: ${results.url}`,
    `Rules checked: ${results.passes.length + results.violations.length + results.incomplete.length}`,
    `Passed: ${results.passes.length}   Violations: ${results.violations.length}   Needs manual review: ${results.incomplete.length}`,
    '',
    'Violations:',
    formatViolations(results.violations),
    '',
    'Needs manual review (axe could not decide):',
    results.incomplete.map((r) => `  ${r.id} - ${r.help} (${r.nodes.length})`).join('\n') || '  none',
  ].join('\n');
}

/** "wcag143" -> "1.4.3" */
function toCriterion(tag: string): string {
  const digits = tag.replace('wcag', '');
  return `${digits[0]}.${digits[1]}.${digits.slice(2)}`;
}
