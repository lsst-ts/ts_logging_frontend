/**
 * Env vars are always strings, so "false" would be truthy if used directly.
 *
 * @param {string|undefined} value - The raw environment variable value.
 * @returns {boolean} True if the value spells out an affirmative.
 */
const parseBooleanEnv = (value) =>
  ["true", "1", "yes", "on"].includes(String(value).trim().toLowerCase());

/**
 * Whether this build is the Scientific Nightly Digest: a separate, public-facing
 * deployment aimed at the scientific community rather than Rubin internal users,
 * served from static files instead of the FastAPI backend.
 *
 * Set at build time with `VITE_SCIENTIFIC_NIGHTLY_DIGEST`; off by default, so a
 * plain build is the internal Nightly Digest.
 *
 * @type {boolean}
 */
const isScientificNightlyDigest = parseBooleanEnv(
  import.meta.env.VITE_SCIENTIFIC_NIGHTLY_DIGEST,
);

export { isScientificNightlyDigest };
