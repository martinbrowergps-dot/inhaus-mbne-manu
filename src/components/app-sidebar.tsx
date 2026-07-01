import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  Thermometer,
  ClipboardCheck,
  ArrowLeftRight,
  AlertTriangle,
  Activity,
  Inbox,
  FileWarning,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useDateFilter } from "@/hooks/use-date-filter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Visão Geral", url: "/", icon: LayoutDashboard },
  { title: "Programação", url: "/programacao", icon: CalendarDays },
  { title: "Backlog", url: "/backlog", icon: Inbox },
  { title: "Equipe", url: "/equipe", icon: Users },
  { title: "HH Semanal", url: "/hh-semanal", icon: Clock },
  { title: "Temperaturas", url: "/temperaturas", icon: Thermometer },
  { title: "Planos de Manutenção", url: "/checklists", icon: ClipboardCheck },
  { title: "Passagem de Turno", url: "/passagem-turno", icon: ArrowLeftRight },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle },
  { title: "NC", url: "/nc", icon: FileWarning },
  { title: "Preditivas", url: "/preditivas", icon: TrendingUp },
  { title: "Indicadores", url: "/indicadores", icon: Activity },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { startDate, endDate, setStartDate, setEndDate, clearFilter, setPreset, isActive } =
    useDateFilter();
  const [openCalendar, setOpenCalendar] = useState(false);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-9 w-auto shrink-0"
          />
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="text-[10px] font-bold tracking-[0.18em] text-primary">
              MARTIN BROWER
            </div>
            <div className="text-[10px] text-muted-foreground tracking-wider">
              IN HAUS INDUSTRIAL
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.18em] text-muted-foreground">
            CENTRO DE CONTROLE
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:border-l-2 data-[active=true]:border-primary"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-0">
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground">
              FILTRO DE DATAS
            </span>
            {isActive && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                ativo
              </span>
            )}
          </div>
          <div className="px-3 pb-3 flex flex-col gap-1.5">
            <div className="flex gap-1">
              <button
                onClick={() => setPreset("week")}
                className={`flex-1 rounded text-[10px] py-1 font-semibold ${
                  isActive ? "bg-primary/15 text-primary" : "bg-sidebar-accent text-sidebar-accent-foreground"
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setPreset("month")}
                className={`flex-1 rounded text-[10px] py-1 font-semibold ${
                  isActive ? "bg-primary/15 text-primary" : "bg-sidebar-accent text-sidebar-accent-foreground"
                }`}
              >
                Mês
              </button>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-sidebar-border bg-sidebar px-2 py-1 text-[11px] text-sidebar-foreground [color-scheme:dark]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border border-sidebar-border bg-sidebar px-2 py-1 text-[11px] text-sidebar-foreground [color-scheme:dark]"
            />
            {isActive && (
              <button
                onClick={clearFilter}
                className="w-full rounded bg-destructive/15 py-1 text-[10px] font-semibold text-destructive"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
        {/* Ícone do calendário quando sidebar está recolhida */}
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center py-2">
          <button
            onClick={() => setOpenCalendar(!openCalendar)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isActive ? "bg-primary/20 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
            title="Filtrar por data"
          >
            <Calendar className="h-4 w-4" />
          </button>
          {openCalendar && (
            <div className="fixed bottom-16 left-4 z-50 flex w-64 flex-col gap-1.5 rounded-xl border border-sidebar-border bg-sidebar p-3 shadow-lg">
              <div className="flex gap-1">
                <button
                  onClick={() => { setPreset("week"); setOpenCalendar(false); }}
                  className="flex-1 rounded bg-primary/15 px-1 py-1 text-[10px] font-semibold text-primary"
                >
                  Semana
                </button>
                <button
                  onClick={() => { setPreset("month"); setOpenCalendar(false); }}
                  className="flex-1 rounded bg-primary/15 px-1 py-1 text-[10px] font-semibold text-primary"
                >
                  Mês
                </button>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border border-sidebar-border bg-sidebar-accent px-2 py-1 text-[11px] text-sidebar-foreground [color-scheme:dark]"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border border-sidebar-border bg-sidebar-accent px-2 py-1 text-[11px] text-sidebar-foreground [color-scheme:dark]"
              />
              {isActive && (
                <button
                  onClick={() => { clearFilter(); setOpenCalendar(false); }}
                  className="rounded bg-destructive/15 py-1 text-[10px] font-semibold text-destructive"
                >
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
