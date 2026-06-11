import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "index.ts"),
      name: "DateTimePickerSolid",
      fileName: (format) => `index.${format}.js`,
      cssFileName: "style",
      formats: ["es", "umd"],
    },
    rollupOptions: {
      external: ["solid-js"],
      output: {
        globals: {
          "solid-js": "solidJs",
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [solidPlugin(), dts({ insertTypesEntry: true })],
});
