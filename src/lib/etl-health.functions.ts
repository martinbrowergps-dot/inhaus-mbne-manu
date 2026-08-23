import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Interface para representar o estado de saúde do ETL.
 */
export interface EtlHealth {
  lastSync: string | null;
  status: "ok" | "warning" | "error";
  errorCount24h: number;
  avgDurationMs: number;
}

/**
 * Busca o status consolidado de saúde do ETL.
 */
export const getEtlHealth = createServerFn({ method: "GET" }).handler(async () => {
  const { data: logs, error } = await supabaseAdmin
    .from("sync_log")
    .select("created_at, sucesso, duracao_ms")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !logs || logs.length === 0) {
    return {
      lastSync: null,
      status: "error",
      errorCount24h: 0,
      avgDurationMs: 0,
    } as EtlHealth;
  }

  const lastLog = logs[0];
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentLogs = logs.filter(l => new Date(l.created_at) > last24h);
  const errorCount = recentLogs.filter(l => !l.sucesso).length;
  
  const durations = logs.filter(l => l.duracao_ms).map(l => l.duracao_ms!);
  const avgDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length 
    : 0;

  let status: EtlHealth["status"] = "ok";
  if (!lastLog.sucesso) status = "error";
  else if (errorCount > 2) status = "warning";

  return {
    lastSync: lastLog.created_at,
    status,
    errorCount24h: errorCount,
    avgDurationMs: Math.round(avgDuration),
  } as EtlHealth;
});
