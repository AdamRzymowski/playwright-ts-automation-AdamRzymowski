import { test as base, expect as baseExpect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import * as allure from 'allure-js-commons';

export type Platform = 'Desktop' | 'Mobile';

/** Mobile projects are named mobile-*, everything else is desktop. */
export function platformOf(projectName: string): Platform {
  return projectName.startsWith('mobile') ? 'Mobile' : 'Desktop';
}

/**
 * Shared base for every site's fixtures. Labels each test Desktop or Mobile in Allure
 * (parentSuite + a "platform" label) so the report can group and filter by it.
 */
export const test = base.extend<{ platformLabel: void }>({
  platformLabel: [
    async ({}, use, testInfo) => {
      const platform = platformOf(testInfo.project.name);
      // Read by the Testiny reporter (customResultFields: ['platform']).
      testInfo.annotations.push({ type: 'platform', description: platform });
      await allure.parentSuite(platform);
      await allure.label('platform', platform);
      await use();
    },
    { auto: true },
  ],
});

// ---- Evidence screenshots (steps and assertions) ------------------------------------------------
// One screenshot after each named test.step() and one per assertion, so the report shows what the page looked
// like at every check. To keep reports small:
// - compressed JPEG of the visible screen at normal pixel density (phones would otherwise be 2.6x larger);
// - when the screen hasn't changed since this test's previous screenshot, a one-line text note is attached
//   instead of the same image again, so every check still appears in the report.
// Playwright adds a full-page screenshot when a test fails (config: screenshot 'only-on-failure').

let activePage: Page | undefined;
/** Hash of the last screenshot attached per test, to skip identical images. */
const lastShot = new Map<string, string>();

/** Called by the site fixtures so step screenshots know which page to capture. */
export function setActivePage(page: Page | undefined) {
  activePage = page;
}

async function attachScreenshot(name: string) {
  if (!activePage || activePage.isClosed()) return;
  try {
    const info = base.info();
    const body = await activePage.screenshot({ type: 'jpeg', quality: 50, scale: 'css' });
    const hash = createHash('sha1').update(body).digest('hex');
    const key = `${info.testId}#${info.retry}`;
    if (lastShot.get(key) === hash) {
      await info.attach(`${name} (same screen as the previous screenshot)`, { body: 'Screen unchanged since the previous screenshot.', contentType: 'text/plain' });
      return;
    }
    lastShot.set(key, hash);
    await info.attach(name, { body, contentType: 'image/jpeg' });
  } catch {
    // Evidence-taking must never fail a test (page closed or navigating).
  }
}

const attachStepScreenshot = (title: string) => attachScreenshot(`after step: ${title}`);

/** Wraps test.step so every step that completes attaches an "after step" screenshot inside the step. */
export function withStepScreenshots<T>(t: T): T {
  const target = t as unknown as { step: (...args: unknown[]) => Promise<unknown> };
  const original = target.step;
  const wrapped = (title: string, body: (info: unknown) => unknown, options?: unknown) =>
    original.call(
      t,
      title,
      async (info: unknown) => {
        const result = await body(info);
        await attachStepScreenshot(title);
        return result;
      },
      options,
    );
  // Keep test.step.skip and any other helpers hanging off the original.
  Object.assign(wrapped, original);
  target.step = wrapped as typeof original;
  return t;
}

// ---- Assertion screenshots -------------------------------------------------------------------
// Proof for every check: each expect(...) assertion, hard or soft, attaches a screenshot of the page
// labelled "✓ passed" or "✗ failed" with what was checked (see "Evidence screenshots" above for how they are
// kept small). ASSERT_SCREENSHOTS=0 turns them off (e.g. for a quick run).

const ASSERT_SCREENSHOTS = process.env.ASSERT_SCREENSHOTS !== '0';
/** Screenshots still being taken for synchronous assertions; awaited before the test ends. */
const pending: Promise<void>[] = [];

/** Short readable name for the value being checked. */
function describeActual(actual: unknown): string {
  if (actual && typeof actual === 'object' && 'toString' in actual) {
    const text = String(actual);
    if (text !== '[object Object]') return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  }
  if (typeof actual === 'string') return JSON.stringify(actual.length > 40 ? `${actual.slice(0, 37)}…` : actual);
  if (typeof actual === 'number' || typeof actual === 'boolean' || actual == null) return String(actual);
  return Array.isArray(actual) ? `list of ${actual.length}` : typeof actual;
}

async function attachAssertionScreenshot(passed: boolean, label: string) {
  if (!ASSERT_SCREENSHOTS) return;
  await attachScreenshot(`${passed ? '✓ passed' : '✗ failed'}: ${label}`);
}

/** Wraps a matcher object (from expect(x), expect.soft(x), .not, …) so every matcher call is screenshotted. */
function wrapMatchers(matchers: object, describe: string, negated = false): object {
  return new Proxy(matchers, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === 'not' && value && typeof value === 'object') return wrapMatchers(value, describe, !negated);
      if ((prop === 'resolves' || prop === 'rejects') && value && typeof value === 'object') return wrapMatchers(value, describe, negated);
      if (typeof value !== 'function' || typeof prop !== 'string' || !prop.startsWith('to')) return value;

      return (...args: unknown[]) => {
        const info = base.info();
        const errorsBefore = info.errors.length;
        const label = `${describe} ${negated ? 'not.' : ''}${prop}${args.length ? `(${args.map(describeActual).join(', ')})` : ''}`;
        const failedNow = () => info.errors.length > errorsBefore; // soft assertions record instead of throwing
        let result: unknown;
        try {
          result = value.apply(target, args);
        } catch (error) {
          pending.push(attachAssertionScreenshot(false, label));
          throw error;
        }
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          // Async matchers (locators, pages, polls): take the screenshot right when they settle.
          return (result as Promise<unknown>).then(
            async (v) => {
              await attachAssertionScreenshot(!failedNow(), label);
              return v;
            },
            async (error) => {
              await attachAssertionScreenshot(false, label);
              throw error;
            },
          );
        }
        // Sync matchers (values): screenshot in the background, collected before the test ends.
        pending.push(attachAssertionScreenshot(!failedNow(), label));
        return result;
      };
    },
  });
}

/** expect() with a screenshot after every assertion. Use it instead of @playwright/test's expect. */
export function withAssertionScreenshots<E extends (...args: never[]) => unknown>(expectFn: E): E {
  const wrapCall =
    (fn: (...args: unknown[]) => unknown) =>
    (actual: unknown, ...rest: unknown[]) => {
      const matchers = fn(actual, ...rest) as object;
      const message = typeof rest[0] === 'string' ? rest[0] : typeof (rest[0] as { message?: string })?.message === 'string' ? (rest[0] as { message: string }).message : '';
      const firstLine = message.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';
      const short = firstLine.length > 90 ? `${firstLine.slice(0, 87)}…` : firstLine;
      return wrapMatchers(matchers, short ? `"${short}":` : `${describeActual(actual)}`);
    };
  const wrapped = wrapCall(expectFn as unknown as (...args: unknown[]) => unknown) as unknown as E;
  // Keep expect.soft, expect.poll, expect.extend, expect.configure, … ; wrap the ones that assert.
  Object.assign(wrapped, expectFn);
  const asAny = wrapped as unknown as Record<string, unknown>;
  const original = expectFn as unknown as Record<string, (...args: unknown[]) => unknown>;
  asAny.soft = wrapCall(original.soft.bind(expectFn));
  asAny.poll = (fn: unknown, options?: unknown) => wrapMatchers(original.poll.call(expectFn, fn, options) as object, 'poll');
  return wrapped;
}

/** Waits for any screenshots of synchronous assertions; site fixtures call this before the test ends. */
export async function flushAssertionScreenshots() {
  await Promise.allSettled(pending.splice(0));
}

export const expect = withAssertionScreenshots(baseExpect);
