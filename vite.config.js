import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { parseBooleanEnv } from "./src/utils/parseBooleanEnv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The config runs in Node, so `import.meta.env` isn't available; loadEnv
  // merges .env files with process.env (Dockerfile ENV, Playwright env).
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // The Scientific Nightly Digest is served from the domain root; the internal
  // Nightly Digest lives under /nightlydigest/. App code reads the result as
  // `import.meta.env.BASE_URL` rather than hardcoding either path.
  const isScientificNightlyDigest = parseBooleanEnv(
    env.VITE_SCIENTIFIC_NIGHTLY_DIGEST,
  );

  return {
    base: isScientificNightlyDigest ? "/" : "/nightlydigest/",
    plugins: [react(), tailwindcss()],
    test: {
      globals: true,
      environment: "jsdom",
      passWithNoTests: true,
      include: ["tests/**/*.test.js"],
      exclude: ["tests/e2e/**"],
      setupFiles: "./vitest.setup.js",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      allowedHosts: ["frontend"],
    },
  };
});
