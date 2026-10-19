/** The site under test (Substandard Monsters). Point it elsewhere with environment variables (e.g. in .env). */

/**
 * Substandard Monsters environments:
 * - live:  the published site, https://substandard-monsters.com (main branch on Netlify)
 * - dev:   Netlify's branch deploy of the dev branch, to test changes before publishing
 * - local: the ../Substandard-Monsters folder on this PC, served by tools/serve-static.mjs
 * Pick one with MONSTERS_ENV=live|dev|local (default: local). MONSTERS_URL still overrides everything.
 */
export type MonstersEnv = 'live' | 'dev' | 'local';

export const MONSTERS_DIR = process.env.MONSTERS_DIR ?? '../Substandard-Monsters';
export const MONSTERS_PORT = 4173;

export const MONSTERS_URLS: Record<MonstersEnv, string> = {
  live: process.env.MONSTERS_LIVE_URL ?? 'https://substandard-monsters.com',
  // Netlify branch deploy: dev--<Netlify site name>.netlify.app
  dev: process.env.MONSTERS_DEV_URL ?? `https://dev--${process.env.MONSTERS_NETLIFY_SITE ?? 'substandard-monsters'}.netlify.app`,
  local: process.env.MONSTERS_LOCAL_URL ?? `http://localhost:${MONSTERS_PORT}`,
};

const requested = (process.env.MONSTERS_ENV ?? 'local').toLowerCase();
// With MONSTERS_URL the address is given directly, so the name is just a label (e.g. "preview").
if (!process.env.MONSTERS_URL && !(requested in MONSTERS_URLS)) {
  throw new Error(`MONSTERS_ENV must be live, dev or local (got "${process.env.MONSTERS_ENV}")`);
}

/** Which environment the tests run against, e.g. live, dev, local, preview; "custom" for a bare MONSTERS_URL. */
export const MONSTERS_ENV: string = process.env.MONSTERS_URL && !process.env.MONSTERS_ENV ? 'custom' : requested;
export const MONSTERS_URL = (process.env.MONSTERS_URL ?? MONSTERS_URLS[requested as MonstersEnv]).replace(/\/$/, '');
/** True when the tests need Playwright to start the local web server. */
export const MONSTERS_IS_LOCAL = MONSTERS_URL === MONSTERS_URLS.local.replace(/\/$/, '');
