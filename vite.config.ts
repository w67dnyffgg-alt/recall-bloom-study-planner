// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Pre-bundle deps used by signed-in pages up front, so opening a page for the
    // first time doesn't trigger a dependency re-optimization + reload that leaves
    // the browser importing stale module URLs ("Importing a module script failed").
    optimizeDeps: {
      include: [
        "@supabase/supabase-js",
        "@lovable.dev/cloud-auth-js",
        "@tanstack/react-query",
        "@radix-ui/react-slot",
        "@radix-ui/react-dialog",
        "@radix-ui/react-label",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
        "lucide-react",
        "sonner",
      ],
    },
  },
});
