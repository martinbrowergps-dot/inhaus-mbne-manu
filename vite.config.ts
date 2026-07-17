// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Recharts — heavy chart lib used in ~8/11 routes
            if (id.includes("node_modules/recharts")) return "vendor-charts";
            // jsPDF — export only, now dynamically imported but keep chunk isolated
            if (id.includes("node_modules/jspdf")) return "vendor-export";
            if (id.includes("node_modules/html-to-image") || id.includes("node_modules/html2canvas")) return "vendor-export";
            // date-fns — ~75KB standalone
            if (id.includes("node_modules/date-fns")) return "vendor-date";
            // Radix UI + companions — heavy UI
            if (id.includes("node_modules/@radix-ui/")) return "vendor-ui";
            if (id.includes("node_modules/cmdk")) return "vendor-ui";
            if (id.includes("node_modules/react-day-picker")) return "vendor-ui";
            if (id.includes("node_modules/embla-carousel")) return "vendor-ui";
            if (id.includes("node_modules/vaul")) return "vendor-ui";
            if (id.includes("node_modules/sonner")) return "vendor-ui";
            // React — framework
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "vendor-react";
            // TanStack — state/router/query
            if (id.includes("node_modules/@tanstack/")) return "vendor-tanstack";
            // Everything else stays in main bundle
            return undefined;
          },
        },
      },
    },
  },
});
