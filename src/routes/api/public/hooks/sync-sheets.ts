import { createFileRoute } from "@tanstack/react-router";
import { fetchSheetsData } from "@/lib/sheets";

const SNAPSHOT_ID = "11111111-1111-4111-8111-111111111111";

async function runSync() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const data = await fetchSheetsData();
  const { error } = await supabaseAdmin.from("sheets_snapshot").upsert(
    {
      id: SNAPSHOT_ID,
      payload: data as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
  return {
    ok: true,
    fetchedAt: data.fetchedAt,
    counts: {
      programacao: data.programacao.length,
      medicoes: data.medicoes.length,
      backlog: data.backlog.length,
      nc: data.nc.length,
      preditiva: data.preditiva.length,
      planoManutencao: data.planoManutencao.length,
    },
  };
}

async function handle() {
  try {
    const result = await runSync();
    return Response.json(result);
  } catch (err) {
    console.error("[sync-sheets] falha:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/hooks/sync-sheets")({
  server: {
    handlers: {
      POST: handle,
      GET: handle,
    },
  },
});
