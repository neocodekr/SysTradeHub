import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "pages",
  publicDir: "../public",
  base: "/",
  define: { __STATIC_DEPLOY__: "true" },
  plugins: [react()],
  build: { outDir: "../pages-dist", emptyOutDir: true },
});
