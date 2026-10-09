import { defineConfig } from "tsup";

export default defineConfig({
  entry: { browser: "src/browser.ts" },
  format: ["iife"],
  globalName: "FossaPayCheckout",
  outDir: "dist/browser",
  clean: false,
  minify: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  outExtension: () => ({ js: ".global.js" }),
});
