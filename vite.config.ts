// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    routeRules: {
      "/**": {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
          "Content-Security-Policy": [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://docs.google.com https://www.gstatic.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https://docs.google.com https://storage.googleapis.com",
            "connect-src 'self' https://docs.google.com https://www.gstatic.com",
            "font-src 'self' data:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'none'",
          ].join("; "),
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        },
      },
    },
  } as any,
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/recharts")) return "vendor-charts";
            if (id.includes("node_modules/jspdf")) return "vendor-export";
            if (id.includes("node_modules/html-to-image") || id.includes("node_modules/html2canvas")) return "vendor-export";
            if (id.includes("node_modules/date-fns")) return "vendor-date";
            if (id.includes("node_modules/@radix-ui/")) return "vendor-ui";
            if (id.includes("node_modules/cmdk")) return "vendor-ui";
            if (id.includes("node_modules/react-day-picker")) return "vendor-ui";
            if (id.includes("node_modules/embla-carousel")) return "vendor-ui";
            if (id.includes("node_modules/vaul")) return "vendor-ui";
            if (id.includes("node_modules/sonner")) return "vendor-ui";
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "vendor-react";
            if (id.includes("node_modules/@tanstack/")) return "vendor-tanstack";
            return undefined;
          },
        },
      },
    },
  },
});
