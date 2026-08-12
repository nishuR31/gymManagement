import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@gym/shared": path.resolve(dirname, "../../packages/shared/src")
    }
  },
  test: {
    environment: "node",
    globals: true,
    restoreMocks: true
  }
});
