import { fetchSheetsData } from "@/lib/sheets";

const SNAPSHOT_ID = "11111111-1111-4111-8111-111111111111";

export async function runSync() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const data = await fetchSheetsData();
  const { error } = await supabaseAdmin.from("sheets_snapshot").upsert(
    {
      id: SNAPSHOT_ID,
      payload: JSON.parse(JSON.stringify(data)),
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
  return {
    ok: true as const,
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
