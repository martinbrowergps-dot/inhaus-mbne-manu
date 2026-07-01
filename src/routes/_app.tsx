import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopHeader } from "@/components/top-header";
import { GlobalFiltersBar } from "@/components/global-filters-bar";
import { Toaster } from "@/components/ui/sonner";
import { sheetsQueryOptions } from "@/lib/sheets";
import { filtersSearchValidator } from "@/lib/filters";

export const Route = createFileRoute("/_app")({
  validateSearch: filtersSearchValidator,
  loader: ({ context }) => {
    // Prime the cache; do not block on errors so empty/error UI still renders
    context.queryClient.prefetchQuery(sheetsQueryOptions);
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopHeader />
          <GlobalFiltersBar />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      <Toaster theme="dark" position="top-right" />
    </SidebarProvider>
  );
}

