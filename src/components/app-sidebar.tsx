import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
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
  FileText,
  LayoutGrid,
} from "lucide-react";
import { useDateFilter } from "@/hooks/use-date-filter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { formatDateBR } from "@/lib/format";
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
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Indicadores", url: "/indicadores", icon: Activity },
  { title: "Temperaturas", url: "/temperaturas", icon: Thermometer },
  { title: "Preditiva - SEMEQ", url: "/preditivas", icon: TrendingUp },
  { title: "Backlog", url: "/backlog", icon: Inbox },
  { title: "HH Semanal", url: "/hh-semanal", icon: Clock },
  { title: "Matriz de Priorização", url: "/matriz-priorizacao", icon: LayoutGrid },
  { title: "Planos de Manutenção", url: "/checklists", icon: ClipboardCheck },
  { title: "NC", url: "/nc", icon: FileWarning },
  { title: "Passagem de Turno", url: "/passagem-turno", icon: ArrowLeftRight },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { startDate, endDate, setStartDate, setEndDate, clearFilter, setPreset, isActive } =
    useDateFilter();
  const [openStartCalendar, setOpenStartCalendar] = useState(false);
  const [openEndCalendar, setOpenEndCalendar] = useState(false);

  const parseISO = (iso: string): Date | undefined => {
    if (!iso) return undefined;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const toISO = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-2 py-3">
          <img src="/logo.png" alt="Logo" width={36} height={36} className="h-9 w-auto shrink-0" />
          <div className="transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none">
            <div className="text-[10px] font-bold tracking-[0.18em] text-primary">
              MARTIN BROWER
            </div>
            <div className="text-[10px] text-sidebar-foreground/70 tracking-wider">
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
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:font-medium"
                    >
                      <Link
                        to={item.url}
                        className="flex items-center gap-3"
                        aria-current={active ? "page" : undefined}
                      >
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
                className={`clay-sm flex-1 rounded-lg text-[10px] py-1 font-semibold ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-sidebar-accent text-sidebar-accent-foreground"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar`}
              >
                Semana
              </button>
              <button
                onClick={() => setPreset("month")}
                className={`clay-sm flex-1 rounded-lg text-[10px] py-1 font-semibold ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-sidebar-accent text-sidebar-accent-foreground"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar`}
              >
                Mês
              </button>
            </div>
            <Popover open={openStartCalendar} onOpenChange={setOpenStartCalendar}>
              <PopoverTrigger asChild>
                <button className="w-full rounded-lg border border-sidebar-border bg-sidebar px-2 py-1.5 text-left text-[11px] text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="text-muted-foreground">Início:</span>{" "}
                  {startDate ? formatDateBR(startDate) : "Selecionar"}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 border-sidebar-border bg-sidebar">
                <CalendarPicker
                  mode="single"
                  selected={parseISO(startDate)}
                  onSelect={(date) => {
                    if (date) setStartDate(toISO(date));
                    setOpenStartCalendar(false);
                  }}
                  className="scale-90 origin-top-left"
                />
              </PopoverContent>
            </Popover>
            <Popover open={openEndCalendar} onOpenChange={setOpenEndCalendar}>
              <PopoverTrigger asChild>
                <button className="w-full rounded-lg border border-sidebar-border bg-sidebar px-2 py-1.5 text-left text-[11px] text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="text-muted-foreground">Fim:</span>{" "}
                  {endDate ? formatDateBR(endDate) : "Selecionar"}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 border-sidebar-border bg-sidebar">
                <CalendarPicker
                  mode="single"
                  selected={parseISO(endDate)}
                  onSelect={(date) => {
                    if (date) setEndDate(toISO(date));
                    setOpenEndCalendar(false);
                  }}
                  className="scale-90 origin-top-left"
                />
              </PopoverContent>
            </Popover>
            {isActive && (
              <button
                onClick={clearFilter}
                className="clay-sm w-full rounded-lg bg-destructive/15 py-1 text-[10px] font-semibold text-destructive"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
        {/* Ícone do calendário quando sidebar está recolhida */}
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center py-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`clay-sm relative flex h-8 w-8 items-center justify-center rounded-lg ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar`}
                title="Filtrar por data"
              >
                <Calendar className="h-4 w-4" />
                {isActive && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="right"
              className="w-64 border-sidebar-border bg-sidebar p-3"
            >
              <div className="flex flex-col gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => setPreset("week")}
                    className="clay-sm flex-1 rounded-lg bg-primary/15 px-1 py-1 text-[10px] font-semibold text-primary"
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setPreset("month")}
                    className="clay-sm flex-1 rounded-lg bg-primary/15 px-1 py-1 text-[10px] font-semibold text-primary"
                  >
                    Mês
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">Início</p>
                  <CalendarPicker
                    mode="single"
                    selected={parseISO(startDate)}
                    onSelect={(date) => {
                      if (date) setStartDate(toISO(date));
                    }}
                    className="scale-90 origin-top-left"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">Fim</p>
                  <CalendarPicker
                    mode="single"
                    selected={parseISO(endDate)}
                    onSelect={(date) => {
                      if (date) setEndDate(toISO(date));
                    }}
                    className="scale-90 origin-top-left"
                  />
                </div>
                {isActive && (
                  <button
                    onClick={clearFilter}
                    className="clay-sm w-full rounded-lg bg-destructive/15 py-1 text-[10px] font-semibold text-destructive"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
