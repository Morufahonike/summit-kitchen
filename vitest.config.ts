import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // the real "server-only" package throws outside Next's server bundle
    alias: { "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)) },
  },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
