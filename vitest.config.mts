import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.tsx"],
    environmentMatchGlobs: [["tests/api/**", "node"]],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
