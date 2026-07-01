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
  Factory,
  Inbox,
  FileWarning,
  TrendingUp,
} from "lucide-react";
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

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary shadow-[0_0_20px_rgba(14,165,255,0.4)]">
            <Factory className="h-5 w-5 text-primary-foreground" />
          </div>
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
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="font-semibold tracking-wider">GRP GPS</div>
          <div>Excelência em operação e manutenção industrial.</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
