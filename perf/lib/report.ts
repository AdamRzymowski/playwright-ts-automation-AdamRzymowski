/**
 * Plain-language performance report for every k6 run: a PASSED/FAILED verdict, each pass/fail limit with the
 * measured value, the key numbers and any failed checks. Printed after k6's own summary and saved as
 * reports/k6-<test>-report.md (saveSummary in summary.ts calls it).
 */

type Values = Record<string, number>;
type Metric = { type: string; contains?: string; values: Values; thresholds?: Record<string, { ok: boolean }> };
type Check = { name: string; passes: number; fails: number };
type Group = { checks?: Check[]; groups?: Group[] };
type SummaryData = { metrics: Record<string, Metric>; root_group?: Group; state?: { testRunDurationMs?: number } };

const LABELS: Record<string, string> = {
  checks: 'Checks passed',
  http_req_failed: 'Failed requests',
  'http_req_duration{type:page}': 'HTML page load',
  'http_req_duration{type:asset}': 'CSS / JS / photo load',
  page_ttfb: 'Page time to first byte',
  browser_web_vital_lcp: 'Page load speed (LCP)',
  browser_web_vital_cls: 'Layout shift (CLS)',
  browser_web_vital_inp: 'Response to clicks (INP)',
  tab_switch: 'Gallery tab switch',
  photo_open: 'Photo opens full-size',
  third_party_loads: 'Files loaded from other sites',
};

const TEST_NAMES: Record<string, string> = { smoke: 'Smoke test', load: 'Load test', soak: 'Soak test' };

function fmt(metric: Metric | undefined, v: number | undefined): string {
  if (v == null || !isFinite(v)) return '—';
  if (metric?.contains === 'time') return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
  if (metric?.type === 'rate') return `${Number((v * 100).toFixed(2))}%`;
  if (metric?.contains === 'data') return v >= 1e6 ? `${(v / 1e6).toFixed(1)} MB` : `${Math.round(v / 1e3)} kB`;
  return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/0+$/, '');
}

/** "p(95)<500" → stat p(95), "under", 500. */
function parseRule(rule: string) {
  const m = rule.match(/^\s*([a-z]+(?:\(\d+(?:\.\d+)?\))?)\s*(<=|>=|==|<|>)\s*([\d.]+)\s*$/);
  if (!m) return null;
  const words: Record<string, string> = { '<': 'under', '<=': 'at most', '>': 'over', '>=': 'at least', '==': 'exactly' };
  return { stat: m[1], op: words[m[2]] ?? m[2], limit: Number(m[3]) };
}

/** "p(95)" → "95% of the time", "rate"/"count" → "". */
function statWords(stat: string): string {
  const p = stat.match(/^p\((\d+(?:\.\d+)?)\)$/);
  return p ? `${p[1]}% of the time` : stat === 'avg' ? 'on average' : stat === 'max' ? 'worst case' : '';
}

function allChecks(group: Group | undefined): Check[] {
  if (!group) return [];
  return [...(group.checks ?? []), ...(group.groups ?? []).flatMap(allChecks)];
}

export function performanceReport(name: string, data: SummaryData, site: string): string {
  const { metrics } = data;
  const rows = Object.entries(metrics).flatMap(([key, metric]) =>
    Object.entries(metric.thresholds ?? {}).map(([rule, { ok }]) => {
      const parsed = parseRule(rule);
      const measured = parsed ? metric.values[parsed.stat] : undefined;
      const words = parsed ? statWords(parsed.stat) : '';
      const limit = parsed ? `${words ? `${words}: ` : ''}${parsed.op} ${fmt(metric, parsed.limit)}` : rule;
      return { label: LABELS[key] ?? key, measured: fmt(metric, measured), limit, ok };
    }),
  );
  const passed = rows.every((r) => r.ok);
  const failedChecks = allChecks(data.root_group).filter((c) => c.fails > 0);
  const minutes = (data.state?.testRunDurationMs ?? 0) / 60000;
  const browser = 'browser_http_req_duration' in metrics;
  // Browser runs have no request counter; every request is counted in browser_http_req_failed (passes = failed).
  const failedValues = metrics.browser_http_req_failed?.values;
  const requests = browser ? (failedValues ? (failedValues.passes ?? 0) + (failedValues.fails ?? 0) : undefined) : metrics.http_reqs?.values.count;
  const failedRate = (browser ? metrics.browser_http_req_failed : metrics.http_req_failed)?.values;
  const received = (browser ? metrics.browser_data_received : metrics.data_received)?.values.count;

  const lines = [
    `# ${TEST_NAMES[name] ?? name}: ${passed ? 'PASSED' : 'FAILED'}`,
    '',
    `- **Site:** ${site}`,
    `- **When:** ${new Date().toLocaleString('en-GB')}`,
    `- **Visitors:** up to ${metrics.vus_max?.values.max ?? '—'} at once, for ${minutes >= 1 ? `${minutes.toFixed(1)} min` : `${Math.round(minutes * 60)} s`}`,
    `- **Visits completed:** ${metrics.iterations?.values.count ?? '—'}`,
    `- **Requests:** ${requests ?? '—'}, failed: ${failedRate ? `${failedRate.passes ?? 0} (${fmt({ type: 'rate', values: {} }, failedRate.rate)})` : '—'}, data downloaded: ${fmt({ type: 'counter', contains: 'data', values: {} }, received)}`,
    '',
    '## Pass/fail limits',
    '',
    '| What | Measured | Limit | Result |',
    '| --- | --- | --- | --- |',
    ...rows.map((r) => `| ${r.label} | ${r.measured} | ${r.limit} | ${r.ok ? '✓ passed' : '✗ FAILED'} |`),
    '',
  ];
  if (failedChecks.length) {
    lines.push('## Failed checks', '', '| Check | Passed | Failed |', '| --- | --- | --- |');
    lines.push(...failedChecks.map((c) => `| ${c.name} | ${c.passes} | ${c.fails} |`), '');
  } else {
    lines.push(`All ${allChecks(data.root_group).reduce((a, c) => a + c.passes, 0)} checks passed.`, '');
  }
  return lines.join('\n');
}
