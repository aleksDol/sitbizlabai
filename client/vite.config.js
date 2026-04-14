import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/analyzer/",
  plugins: [react()],
  preview: {
    allowedHosts: ["ai.sitebiz-lab.ru"]
  }
});
