import { Suspense, useEffect, useState } from "react";
import { createFileRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopHeader } from "@/components/top-header";
import { Toaster } from "@/components/ui/sonner";
import { sheetsQueryOptions } from "@/lib/sheets";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(sheetsQueryOptions);
  },
  component: AppLayout,
});

const NAV_SHORTCUTS: Record<string, string> = {
  "1": "/",
  "2": "/programacao",
  "3": "/backlog",
  "4": "/equipe",
  "5": "/hh-semanal",
  "6": "/temperaturas",
  "7": "/planos-manutencao",
  "8": "/passagem-turno",
};

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [authOk, setAuthOk] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState(false);
  const { data } = useQuery(sheetsQueryOptions);
  const warnings = data?.warnings ?? [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          navigate({ to: "/login" });
        } else {
          setAuthOk(true);
        }
      } catch {
        // Supabase não configurado — permite acesso sem auth
        if (!cancelled) setAuthOk(true);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.altKey && NAV_SHORTCUTS[e.key]) {
        e.preventDefault();
        navigate({ to: NAV_SHORTCUTS[e.key] });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  if (!authOk) return null;

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopHeader />
          {warnings.length > 0 && !dismissedWarnings && (
            <div className="flex items-start gap-2 border-b border-warning/20 bg-warning/5 px-4 py-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <div className="flex-1 space-y-0.5">
                {warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
              <button
                onClick={() => setDismissedWarnings(true)}
                aria-label="Fechar aviso"
                className="shrink-0 rounded p-0.5 transition-colors hover:bg-warning/10"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <main className="flex-1 p-4 md:p-6">
            <div key={pathname} className="page-enter">
              <Suspense fallback={
                <div className="grid gap-4 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-lg bg-card/40 border border-border/30" />
                  ))}
                </div>
              }>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </SidebarInset>
      </div>
      <Toaster theme="dark" position="top-right" offset={{ top: 64 }} />
    </SidebarProvider>
  );
}
