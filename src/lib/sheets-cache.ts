import { queryOptions } from "@tanstack/react-query";
import { fetchSheetsData } from "./sheets";
import type { SheetsData } from "./sheets-types";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

/** Idade máxima aceita para o cache do banco antes de disparar novo ETL. */
export const CACHE_MAX_AGE_MS = 5 * 60_000;

let syncInFlight = false;

/** Dispara o ETL no servidor sem bloquear a tela. */
function triggerSync() {
  if (syncInFlight || typeof window === "undefined") return;
  syncInFlight = true;
  fetch("/api/public/hooks/sync-sheets", { method: "POST" })
    .catch((err) => console.warn("[sheets-cache] sync falhou:", err))
    .finally(() => {
      syncInFlight = false;
    });
}

/**
 * Lê os dados do cache no banco (rápido). Se o cache estiver ausente ou velho,
 * dispara o ETL e cai para a leitura direta da planilha.
 */
export async function fetchSheetsCached(): Promise<SheetsData> {
  if (!isSupabaseConfigured) return fetchSheetsData();

  try {
    const { data, error } = await supabase
      .from("sheets_snapshot")
      .select("payload, fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data?.payload) {
      const age = Date.now() - new Date(data.fetched_at as string).getTime();
      if (age > CACHE_MAX_AGE_MS) triggerSync();
      if (age < CACHE_MAX_AGE_MS * 3) {
        return { ...(data.payload as unknown as SheetsData), fromCache: true };
      }
    } else {
      triggerSync();
    }
  } catch (err) {
    console.warn("[sheets-cache] cache indisponível, lendo planilha direto:", err);
  }

  const fresh = await fetchSheetsData();
  triggerSync();
  return fresh;
}

export const sheetsCachedQueryOptions = queryOptions({
  queryKey: ["sheets"],
  queryFn: fetchSheetsCached,
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: false,
});
