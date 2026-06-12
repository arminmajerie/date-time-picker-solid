import path from "node:path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      "@arminmajerie/date-time-picker-solid": path.resolve(__dirname, "../dtp-solid/index.ts"),
    },
  },
  server: {
    port: 3000,
  },
});
