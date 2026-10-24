import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  server: { port: 5173, watch: { usePolling: true, interval: 400 } },
});
