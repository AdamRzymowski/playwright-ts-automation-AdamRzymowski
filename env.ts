/**
 * Loads settings and secrets (e.g. TESTINY_API_KEY) from a local .env file if there is one.
 * .env is git-ignored; .env.example lists the available variables.
 * Variables already set in the shell win over the file.
 */
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the shell environment.
}

export {};
