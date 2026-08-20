import { fetchSheetsData } from "@/lib/sheets";

const SNAPSHOT_ID = "11111111-1111-4111-8111-111111111111";

export type SyncMeta = {
  origem: "manual" | "cron";
  userId?: string | null;
  userEmail?: string | null;
};

export async function runSync(meta: SyncMeta = { origem: "cron" }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const started = Date.now();

  const logResult = async (
    sucesso: boolean,
    extra: {
      erro?: string;
      counts?: Record<string, number>;
      warnings?: string[] | null;
    },
  ) => {
    try {
      await supabaseAdmin.from("sync_log").insert({
        origem: meta.origem,
        user_id: meta.userId ?? null,
        user_email: meta.userEmail ?? null,
        sucesso,
        erro: extra.erro ?? null,
        duracao_ms: Date.now() - started,
        counts: extra.counts ?? null,
        warnings: extra.warnings ?? null,
      });
    } catch (err) {
      console.warn("[sync-sheets] falha ao registrar log:", err);
    }
  };

  try {
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

    const counts = {
      programacao: data.programacao.length,
      medicoes: data.medicoes.length,
      backlog: data.backlog.length,
      nc: data.nc.length,
      preditiva: data.preditiva.length,
      planoManutencao: data.planoManutencao.length,
    };

    await logResult(true, { counts, warnings: data.warnings ?? null });

    return { ok: true as const, fetchedAt: data.fetchedAt, counts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logResult(false, { erro: message });
    throw err;
  }
}
