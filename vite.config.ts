import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: { include: ["tests/**/*.test.ts"], exclude: ["e2e/**"] },
  build: { outDir: "dist/web", emptyOutDir: true },
  server: {
    host: "127.0.0.1",
    port: 4473,
    proxy: { "/api": "http://127.0.0.1:4474", "/health": "http://127.0.0.1:4474" }
  }
});
