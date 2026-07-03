import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
  },
});
