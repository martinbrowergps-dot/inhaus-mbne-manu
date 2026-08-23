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
      className="flex flex-wrap items-stretch gap-3 rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-md shadow-elevated"
    >
      <div className="flex flex-wrap items-center gap-2">
        {aa > 0 && (
          <button
            onClick={() => navigate({ to: "/programacao" })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/15 px-3 py-1.5 text-[10px] font-bold text-destructive transition-all hover:bg-destructive/25 hover:scale-105 active:scale-95 neon-critical"
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            {aa} CRÍTICO AA
          </button>
        )}
        {atrasadas > 0 && (
          <button
            onClick={() => navigate({ to: "/programacao" })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-warning/15 px-3 py-1.5 text-[10px] font-bold text-warning transition-all hover:bg-warning/25 hover:scale-105 active:scale-95 neon-warning"
          >
            <CalendarX className="h-3.5 w-3.5" />
            {atrasadas} ATRASADAS
          </button>
        )}
        {tempAlerta > 0 && (
          <button
            onClick={() => navigate({ to: "/temperaturas" })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-1.5 text-[10px] font-bold text-rose-400 transition-all hover:bg-rose-500/25 hover:scale-105 active:scale-95"
          >
            <Thermometer className="h-3.5 w-3.5" />
            {tempAlerta} TÉRMICOS
          </button>
        )}
      </div>
      <div className="ml-auto flex items-center divide-x divide-white/5">
        <div className="px-5 text-center group transition-all">
          <div className="num text-2xl font-black text-foreground leading-none tracking-tighter group-hover:scale-110 transition-transform">
            {formatInt(total)}
          </div>
          <div className="mt-1.5 text-[9px] font-black tracking-[0.25em] text-muted-foreground uppercase opacity-50 group-hover:opacity-100 transition-opacity">
            Total OS
          </div>
        </div>
        <div className="px-5 text-center group transition-all">
          <div className="num text-2xl font-black text-primary leading-none tracking-tighter group-hover:scale-110 transition-transform">
            {formatInt(emAndamento)}
          </div>
          <div className="mt-1.5 text-[9px] font-black tracking-[0.25em] text-muted-foreground uppercase opacity-50 group-hover:opacity-100 transition-opacity">
            Em Curso
          </div>
        </div>
        <div className="px-5 text-center group transition-all">
          <div className="num text-2xl font-black text-success leading-none tracking-tighter group-hover:scale-110 transition-transform">
            {formatInt(finalizadas)}
          </div>
          <div className="mt-1.5 text-[9px] font-black tracking-[0.25em] text-muted-foreground uppercase opacity-50 group-hover:opacity-100 transition-opacity">
            Sucesso
          </div>
        </div>
      </div>
    </motion.div>
  );
}
