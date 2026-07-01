import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { RefreshCw, Circle, Calendar } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { sheetsQueryOptions } from "@/lib/sheets";
import { formatBRDateTime } from "@/lib/format";
import { toast } from "sonner";
import { useDateFilter } from "@/hooks/use-date-filter";

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl relative">
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
          {now ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
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

      {/* Date filter controls */}
      <DateFilterControls />
    </header>
  );
}

function DateFilterControls() {
  const { startDate, endDate, setStartDate, setEndDate, clearFilter, setPreset, isActive } =
    useDateFilter();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger */}
      <div className="md:hidden">
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold ${
            isActive
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/60 bg-card/50 text-muted-foreground"
          }`}
        >
          <Calendar className="h-3 w-3" />
          {isActive ? "Filtro ativo" : "Filtrar"}
        </button>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
            <div
              className="flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-[#0f2a4a] p-6 pb-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-wider text-white">FILTRAR POR DATA</span>
                <button onClick={() => setOpen(false)} className="text-lg text-white/60 hover:text-white">✕</button>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-lg bg-primary/20 py-2.5 text-sm font-semibold text-white active:bg-primary/30"
                  onClick={() => { setPreset("week"); setOpen(false); }}
                >
                  Semana
                </button>
                <button
                  className="flex-1 rounded-lg bg-primary/20 py-2.5 text-sm font-semibold text-white active:bg-primary/30"
                  onClick={() => { setPreset("month"); setOpen(false); }}
                >
                  Mês
                </button>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border-2 border-white/40 bg-white px-4 py-3 text-base text-gray-900 [color-scheme:light]"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border-2 border-white/40 bg-white px-4 py-3 text-base text-gray-900 [color-scheme:light]"
              />
              <button
                onClick={() => { clearFilter(); setOpen(false); }}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold ${
                  isActive
                    ? "bg-red-500/20 text-red-400 active:bg-red-500/30"
                    : "bg-white/10 text-white/80 active:bg-white/20"
                }`}
              >
                {isActive ? "Limpar filtro" : "Fechar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden items-center gap-2 md:flex">
        <div className="flex items-center gap-1">
          <button
            className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary"
            onClick={() => setPreset("week")}
            title="Semana"
          >
            Semana
          </button>
          <button
            className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary"
            onClick={() => setPreset("month")}
            title="Mês"
          >
            Mês
          </button>
        </div>
        <input
          aria-label="Data início"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-border/60 bg-card px-2 py-1 text-[12px] text-foreground [color-scheme:dark]"
        />
        <input
          aria-label="Data fim"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-md border border-border/60 bg-card px-2 py-1 text-[12px] text-foreground [color-scheme:dark]"
        />
        <button
          onClick={clearFilter}
          className={`text-[11px] px-2 py-1 rounded ${isActive ? "bg-destructive/10 text-destructive" : "bg-muted/10 text-muted-foreground"}`}
        >
          Limpar
        </button>
      </div>
    </>
  );
}
