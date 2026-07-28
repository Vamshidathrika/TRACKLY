import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**"],
    setupFiles: ["./test/setup.ts"],
    // Several component tests legitimately take 5-12s under jsdom +
    // @testing-library/user-event. At vitest's 5000ms default they failed
    // non-deterministically — two runs of an unchanged tree produced two
    // disjoint failure sets. AGENTS.md makes a green suite a precondition for
    // every commit, so a coin-flip suite is the same as no suite.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
