import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/mp.lnr/",
  clearScreen: false,
  server: {
    strictPort: true,
    port: 1420,
  },
  envPrefix: ["VITE_", "TAURI_"],
});
