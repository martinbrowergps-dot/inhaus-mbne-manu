import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarIcon,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import { format, parseISO, startOfDay, subDays, startOfMonth, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { sheetsQueryOptions } from "@/lib/sheets";
import { useFilters, buildFacets } from "@/lib/filters";
import type { FiltersSearch } from "@/lib/filters";

export function GlobalFiltersBar() {
  const { data } = useQuery(sheetsQueryOptions);
  const { filters, range, setFilter, setRange, reset, hasActive } = useFilters();

  const facets = useMemo(() => (data ? buildFacets(data.programacao) : null), [data]);

  const applyPreset = (preset: "hoje" | "7d" | "30d" | "mes") => {
    const today = new Date();
    if (preset === "hoje") setRange(startOfDay(today), endOfDay(today));
    else if (preset === "7d") setRange(startOfDay(subDays(today, 6)), endOfDay(today));
    else if (preset === "30d") setRange(startOfDay(subDays(today, 29)), endOfDay(today));
    else if (preset === "mes") setRange(startOfMonth(today), endOfDay(today));
  };

  const rangeLabel = range.isDefault
    ? "Mês atual"
    : `${format(range.start, "dd/MM/yy")} – ${format(range.end, "dd/MM/yy")}`;

  return (
    <div className="sticky top-16 z-20 border-b border-border/60 bg-background/80 px-4 py-2 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          <Filter className="h-3 w-3" />
          Filtros
        </div>

        {/* Date range */}
        <DateRangePopover
          start={range.start}
          end={range.end}
          isDefault={range.isDefault}
          label={rangeLabel}
          onChange={(s, e) => setRange(s, e)}
        />

        {/* Presets */}
        <div className="hidden flex-wrap items-center gap-1 md:flex">
          {(["hoje", "7d", "30d", "mes"] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant="ghost"
              onClick={() => applyPreset(p)}
              className="h-7 px-2 text-[10px] tracking-wider uppercase text-muted-foreground hover:text-primary"
            >
              {p === "hoje" ? "Hoje" : p === "7d" ? "7d" : p === "30d" ? "30d" : "Mês"}
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Multi-selects */}
        <MultiSelect
          label="Sistema"
          options={facets?.sistemas ?? []}
          selected={filters.sistema}
          onChange={(v) => setFilter("sistema", v)}
        />
        <MultiSelect
          label="Tipo"
          options={facets?.tipos ?? []}
          selected={filters.tipo}
          onChange={(v) => setFilter("tipo", v)}
        />
        <MultiSelect
          label="Status"
          options={facets?.statuses ?? []}
          selected={filters.status}
          onChange={(v) => setFilter("status", v)}
        />
        <MultiSelect
          label="Responsável"
          options={facets?.responsaveis ?? []}
          selected={filters.responsavel}
          onChange={(v) => setFilter("responsavel", v)}
        />
        <MultiSelect
          label="Criticidade"
          options={facets?.criticidades ?? []}
          selected={filters.criticidade}
          onChange={(v) => setFilter("criticidade", v)}
        />

        {hasActive && (
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            className="ml-auto h-7 gap-1 px-2 text-[10px] tracking-wider uppercase text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

function DateRangePopover({
  start,
  end,
  isDefault,
  label,
  onChange,
}: {
  start: Date;
  end: Date;
  isDefault: boolean;
  label: string;
  onChange: (start: Date | undefined, end: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-8 gap-1.5 border-primary/40 text-xs",
            !isDefault && "bg-primary/10 text-primary",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          locale={ptBR}
          defaultMonth={start}
          selected={{ from: start, to: end }}
          onSelect={(r) => {
            onChange(r?.from, r?.to);
            if (r?.from && r?.to) setOpen(false);
          }}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: FiltersSearch[keyof FiltersSearch] & string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((v) => v !== opt)
      : [...selected, opt];
    onChange(next as never);
  };
  const clear = () => onChange([] as never);

  if (options.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-8 gap-1.5 border-border/60 text-xs",
            selected.length > 0 && "border-primary/50 bg-primary/10 text-primary",
          )}
        >
          {label}
          {selected.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 justify-center px-1 text-[10px]"
            >
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            {label}
          </span>
          {selected.length > 0 && (
            <button
              onClick={clear}
              className="text-[10px] text-destructive hover:underline"
            >
              limpar
            </button>
          )}
        </div>
        <ScrollArea className="max-h-64">
          <div className="space-y-0.5">
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(opt)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="flex-1 truncate">{opt}</span>
                </label>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// avoid unused import warning
void parseISO;
