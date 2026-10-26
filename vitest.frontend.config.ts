import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Frontend unit/component tests (no database). The backend's `vitest.config.ts` applies
 * migrations in its global setup, so UI tests get their own config: `npm run test:ui`.
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
