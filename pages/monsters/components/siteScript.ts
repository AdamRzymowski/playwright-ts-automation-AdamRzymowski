import type { Page } from '@playwright/test';

/** How long the site's script may take to start before a test reports a slow page (not a test timeout). */
export const SCRIPT_TIMEOUT = 15_000;

/** script.js fills in the footer version first; once it's there, the click handlers are attached too. */
export async function waitForSiteScript(page: Page) {
  try {
    await page.waitForFunction(() => !!document.getElementById('site-version')?.textContent, undefined, { timeout: SCRIPT_TIMEOUT });
  } catch {
    throw new Error(`Site script did not start within ${SCRIPT_TIMEOUT / 1000} s (page slow to load): ${page.url()}`);
  }
}
