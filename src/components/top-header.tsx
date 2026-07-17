import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { RefreshCw, Circle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sheetsQueryOptions } from "@/lib/sheets";
import { formatBRDateTime } from "@/lib/format";
import { toast } from "sonner";

export function TopHeader() {
  const qc = useQueryClient();
  const { data, isFetching } = useQuery(sheetsQueryOptions);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["sheets"] });
    toast.success("Dados atualizados");
  };

  const lastUpdate = data ? new Date(data.fetchedAt) : null;
  const minutesAgo = lastUpdate
    ? Math.max(0, Math.floor((Date.now() - lastUpdate.getTime()) / 60_000))
    : null;
  const relLabel =
    lastUpdate === null
      ? "—"
      : (minutesAgo ?? 0) < 1
        ? "agora"
        : (minutesAgo ?? 0) < 60
          ? `há ${minutesAgo ?? 0} min`
          : lastUpdate.toLocaleDateString("pt-BR");

  // Cor baseada na idade dos dados
  const freshnessColor =
    minutesAgo === null
      ? "text-muted-foreground"
      : minutesAgo <= 4
        ? "text-success"
        : minutesAgo <= 10
          ? "text-warning"
          : "text-destructive";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
      <SidebarTrigger className="text-primary hover:bg-primary/10" />
      <div className="flex-1">
        <h1 className="text-sm font-bold tracking-[0.22em] text-gradient sm:text-base">
          MARTIN BROWER CDNE
        </h1>
        <p className="text-[11px] text-muted-foreground tracking-wider">
          Centro de Controle de Manutenção Industrial • Recife/PE
        </p>
      </div>

      <div className="hidden items-center gap-2 sm:flex" title={lastUpdate ? formatBRDateTime(lastUpdate) : undefined}>
        <Circle className={`h-1.5 w-1.5 animate-pulse ${freshnessColor.replace("text-", "fill-")}`} />
        <span className={`num text-[10px] ${freshnessColor}`}>Atualizado {relLabel}</span>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary hover:border-primary/60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 border-border/40 bg-card/95 backdrop-blur-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <Circle className="h-2 w-2 fill-success text-success" />
              <span className="font-medium text-success">Online</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Status
                </p>
                <span className={`num text-xs ${freshnessColor}`}>
                  {minutesAgo === null
                    ? "Sem dados"
                    : minutesAgo <= 4
                      ? "Atual"
                      : minutesAgo <= 10
                        ? "Desatualizado"
                        : "Expirado"}
                </span>
              </div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Última atualização
              </p>
              <p className="num text-xs text-foreground">{formatBRDateTime(lastUpdate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Hora atual
              </p>
              <p className="num text-xs text-foreground">
                {now
                  ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                  : "--:--"}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 hover:border-primary/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar dados
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </header>
  );
}
