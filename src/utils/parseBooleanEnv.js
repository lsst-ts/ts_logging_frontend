/**
 * Env vars are always strings, so "false" would be truthy if used directly.
 *
 * Kept free of `import.meta.env` so that `vite.config.js`, which runs in Node,
 * can import it too.
 *
 * @param {string|undefined} value - The raw environment variable value.
 * @returns {boolean} True if the value spells out an affirmative.
 */
const parseBooleanEnv = (value) =>
  ["true", "1", "yes", "on"].includes(String(value).trim().toLowerCase());

export { parseBooleanEnv };
