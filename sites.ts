/** Sites under test. Each can be pointed elsewhere with an environment variable. */

export const SAUCEDEMO_URL = process.env.BASE_URL ?? 'https://www.saucedemo.com';

/** Local checkout of the Substandard Monsters website, served by tools/serve-static.mjs. */
export const MONSTERS_DIR = process.env.MONSTERS_DIR ?? '../Substandard-Monsters';
export const MONSTERS_PORT = 4173;
/** Set MONSTERS_URL to test a deployed copy instead of the local folder. */
export const MONSTERS_URL = process.env.MONSTERS_URL ?? `http://localhost:${MONSTERS_PORT}`;
