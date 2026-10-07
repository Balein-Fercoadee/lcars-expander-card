import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/lcars-expander-card.ts",
      formats: ["es"],
      fileName: () => "lcars-expander-card.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
