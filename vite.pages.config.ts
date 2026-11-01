import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Independent static build: never load .env or Lovable's build/runtime plugins.
export default defineConfig({
  root: "standalone",
  envDir: false,
  envPrefix: "REMEMO_PUBLIC_",
  plugins: [react(), tailwindcss()],
  define: { "import.meta.env.VITE_STANDALONE": JSON.stringify("true") },
  resolve: {
    alias: [
      {
        find: "@/integrations/supabase/client",
        replacement: fileURLToPath(new URL("./src/standalone/cloud-disabled.ts", import.meta.url)),
      },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  publicDir: false,
  build: { outDir: "../pages-dist", emptyOutDir: true, sourcemap: false },
});
