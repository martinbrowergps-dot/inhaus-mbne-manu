import { Suspense, useEffect } from "react";
import { createFileRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopHeader } from "@/components/top-header";
import { Toaster } from "@/components/ui/sonner";
import { sheetsQueryOptions } from "@/lib/sheets";

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
  "7": "/checklists",
  "8": "/passagem-turno",
  "9": "/alertas",
};

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

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

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopHeader />
          <main className="flex-1 p-4 md:p-6">
            <div key={pathname} className="page-enter">
              <Suspense fallback={
                <div className="grid gap-4 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl bg-card/40 border border-border/30" />
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
