import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Testiny run names: <DD.MM.YY>-<environment>-<attempt>, e.g. "20.10.26-live-2"
 * (attempt = how many runs against that environment on that date, counted on this PC).
 * tools/run-tests.mjs uses the same convention and file; keep them in step.
 */
const COUNTER_FILE = 'reports/testiny-runs.json';

export function runDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${String(now.getFullYear()).slice(-2)}`;
}

/** Reserves and returns the next run name for this environment today, e.g. "20.10.26-live-3". */
export function nextRunName(environment: string, now = new Date()): string {
  const prefix = `${runDate(now)}-${environment}`;
  let counts: Record<string, number> = {};
  try {
    if (existsSync(COUNTER_FILE)) counts = JSON.parse(readFileSync(COUNTER_FILE, 'utf8'));
  } catch {
    counts = {};
  }
  counts[prefix] = (counts[prefix] ?? 0) + 1;
  mkdirSync('reports', { recursive: true });
  writeFileSync(COUNTER_FILE, JSON.stringify(counts, null, 2));
  return `${prefix}-${counts[prefix]}`;
}
