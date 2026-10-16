// Runs the whole suite with a screenshot + video of every test, then builds and opens the Allure report,
// even when some tests fail. Extra arguments go to `playwright test` (e.g. tests/monsters --project=chromium).
// Monsters tests target the live site unless MONSTERS_URL is already set.
import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  CAPTURE_ALL: '1',
  MONSTERS_URL: process.env.MONSTERS_URL ?? 'https://substandard-monsters.netlify.app',
};
const run = (args) => spawnSync('npx', args, { stdio: 'inherit', env, shell: true }).status ?? 1;

const testStatus = run(['playwright', 'test', ...process.argv.slice(2)]);
run(['allure', 'generate', 'allure-results', ...(process.env.CI ? [] : ['--open'])]);
process.exit(testStatus);
