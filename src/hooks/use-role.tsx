import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export type AppRole = "admin" | "gestor" | "visualizador";

/** Papéis do usuário logado. Sem backend configurado, assume admin (modo local). */
export function useRole() {
  const query = useQuery({
    queryKey: ["my-roles"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AppRole[]> => {
      if (!isSupabaseConfigured) return ["admin"];
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = query.data ?? [];
  const isAdmin = roles.includes("admin");
  const isGestor = isAdmin || roles.includes("gestor");

  return {
    roles,
    isAdmin,
    isGestor,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
