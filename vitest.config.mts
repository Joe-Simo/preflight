import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(__dirname, "test/empty.ts") } },
  test: { environment: "node", testTimeout: 20000 },
});
