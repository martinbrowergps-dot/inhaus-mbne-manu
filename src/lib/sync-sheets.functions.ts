import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Dispara o ETL da planilha. Apenas usuários autenticados. */
export const syncSheetsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runSync } = await import("@/lib/sync-sheets.server");
    const email =
      typeof context.claims?.["email"] === "string" ? (context.claims["email"] as string) : null;
    return runSync({ origem: "manual", userId: context.userId, userEmail: email });
  });
