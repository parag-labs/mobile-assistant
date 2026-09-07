import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The core is pure TypeScript with no React Native imports, so a node environment is
    // right and fast. Only the engine is unit-tested; the Expo UI is a thin shell over it.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
