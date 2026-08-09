import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Dispara o ETL da planilha. Apenas usuários autenticados. */
export const syncSheetsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { runSync } = await import("@/lib/sync-sheets.server");
    return runSync();
  });
