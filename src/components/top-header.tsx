import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { RefreshCw, Circle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { sheetsQueryOptions } from "@/lib/sheets";
import { formatBRDateTime } from "@/lib/format";
import { toast } from "sonner";

export function TopHeader() {
  const qc = useQueryClient();
  const { data, isFetching } = useQuery(sheetsQueryOptions);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["sheets"] });
    toast.success("Dados atualizados");
  };

  const lastUpdate = data ? new Date(data.fetchedAt) : null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger className="text-primary" />
      <div className="flex-1">
        <h1 className="text-sm font-bold tracking-[0.22em] text-gradient sm:text-base">
          MARTIN BROWER CDNE
        </h1>
        <p className="text-[11px] text-muted-foreground tracking-wider">
          Centro de Controle de Manutenção Industrial • Recife/PE
        </p>
      </div>

      <div className="hidden items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success md:flex">
        <Circle className="h-2 w-2 animate-pulse fill-current" />
        ONLINE
      </div>

      <div className="hidden flex-col text-right text-[10px] text-muted-foreground lg:flex">
        <span className="tracking-wider">ÚLTIMA ATUALIZAÇÃO</span>
        <span className="num text-foreground">{formatBRDateTime(lastUpdate)}</span>
      </div>

      <div className="hidden flex-col text-right text-[10px] text-muted-foreground md:flex">
        <span className="tracking-wider">HORA ATUAL</span>
        <span className="num text-foreground">
          {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={handleRefresh}
        disabled={isFetching}
        className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Atualizar</span>
      </Button>
    </header>
  );
}
