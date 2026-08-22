import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "gestor" | "visualizador";

export type AdminUser = {
  id: string;
  email: string | null;
  nome: string | null;
  created_at: string;
  roles: AppRole[];
};

/** Lista usuários com seus papéis. Apenas admin. */
export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito a administradores");

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, nome, created_at")
        .order("created_at", { ascending: true }),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      nome: p.nome,
      created_at: p.created_at,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
    }));
  });

/** Define o papel único de um usuário. Apenas admin. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: AppRole }) => {
    const valid: AppRole[] = ["admin", "gestor", "visualizador"];
    if (!input?.userId || !valid.includes(input.role)) {
      throw new Error("Parâmetros inválidos");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito a administradores");

    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("Você não pode remover o seu próprio acesso de administrador");
    }

    const { error: delErr } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .neq("role", data.role);
    if (delErr) throw new Error(delErr.message);

    const { error: insErr } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (insErr) throw new Error(insErr.message);

    return { ok: true as const };
  });
