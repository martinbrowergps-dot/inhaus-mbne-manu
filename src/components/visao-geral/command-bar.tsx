import { motion } from "framer-motion";
import { AlertOctagon, CalendarX, Thermometer } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { formatInt } from "@/lib/format";

interface CommandBarProps {
  aa: number;
  atrasadas: number;
  tempAlerta: number;
  total: number;
  emAndamento: number;
  finalizadas: number;
}

export function CommandBar({ 
  aa, 
  atrasadas, 
  tempAlerta, 
  total, 
  emAndamento, 
  finalizadas 
}: CommandBarProps) {
  const navigate = useNavigate();

  return (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
      className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-card/70 p-3 shadow-elevated"
    >
      <div className="flex flex-wrap items-center gap-2">
        {aa > 0 && (
          <button
            onClick={() => navigate({ to: "/programacao" })}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            {aa} CRÍTICO AA
          </button>
        )}
        {atrasadas > 0 && (
          <button
            onClick={() => navigate({ to: "/programacao" })}
            className="inline-flex items-center gap-1.5 rounded-md border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/20"
          >
            <CalendarX className="h-3.5 w-3.5" />
            {atrasadas} ATRASADAS
          </button>
        )}
        {tempAlerta > 0 && (
          <button
            onClick={() => navigate({ to: "/temperaturas" })}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            <Thermometer className="h-3.5 w-3.5" />
            {tempAlerta} TÉRMICOS
          </button>
        )}
      </div>
      <div className="ml-auto flex items-center divide-x divide-border/70">
        <div className="px-5 text-center group transition-all">
          <div className="num text-xl font-semibold leading-none text-foreground">
            {formatInt(total)}
          </div>
          <div className="mt-1.5 text-[10px] font-medium text-muted-foreground">
            Total OS
          </div>
        </div>
        <div className="px-5 text-center group transition-all">
          <div className="num text-xl font-semibold leading-none text-primary">
            {formatInt(emAndamento)}
          </div>
          <div className="mt-1.5 text-[10px] font-medium text-muted-foreground">
            Em Curso
          </div>
        </div>
        <div className="px-5 text-center group transition-all">
          <div className="num text-xl font-semibold leading-none text-success">
            {formatInt(finalizadas)}
          </div>
          <div className="mt-1.5 text-[10px] font-medium text-muted-foreground">
            Sucesso
          </div>
        </div>
      </div>
    </motion.div>
  );
}
