import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataErrorState } from "@/components/data-error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRole } from "@/hooks/use-role";
import { listUsers, setUserRole, type AppRole } from "@/lib/admin-users.functions";
import { formatBRDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/usuarios")({
  component: UsuariosPage,
  head: () => ({
    meta: [
      { title: "Usuários e Permissões | Martin Brower CDNE" },
      {
        name: "description",
        content:
          "Gerencie os usuários do Centro de Controle e defina quem é administrador, gestor ou visualizador.",
      },
      { property: "og:title", content: "Usuários e Permissões | Martin Brower CDNE" },
      {
        property: "og:description",
        content: "Administração de acessos do Centro de Controle de Manutenção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  visualizador: "Visualizador",
};

function UsuariosPage() {
  const qc = useQueryClient();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const [savingId, setSavingId] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
    enabled: isAdmin,
  });

  const handleChange = async (userId: string, role: AppRole) => {
    setSavingId(userId);
    try {
      await setUserRole({ data: { userId, role } });
      toast.success("Permissão atualizada");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["my-roles"] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a permissão");
    } finally {
      setSavingId(null);
    }
  };

  if (roleLoading) {
    return <Skeleton className="h-40" />;
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Usuários e Permissões" />
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito"
          description="Somente administradores podem gerenciar usuários e permissões."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Usuários e Permissões"
        subtitle="Defina quem administra, gerencia ou apenas visualiza o Centro de Controle"
      />

      <Panel title="USUÁRIOS" subtitle="Cada usuário possui um papel principal">
        {users.isLoading ? (
          <Skeleton className="h-40" />
        ) : users.isError ? (
          <DataErrorState error={users.error} onRetry={() => users.refetch()} />
        ) : (users.data ?? []).length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description="Os usuários aparecem aqui após o primeiro acesso ao sistema."
          />
        ) : (
          <div className="space-y-2">
            {(users.data ?? []).map((u) => {
              const current: AppRole = u.roles.includes("admin")
                ? "admin"
                : u.roles.includes("gestor")
                  ? "gestor"
                  : "visualizador";
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/40 p-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{u.nome ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</p>
                      <p className="num text-[11px] text-muted-foreground">
                        desde {formatBRDateTime(new Date(u.created_at))}
                      </p>
                    </div>
                  </div>
                  <Select
                    value={current}
                    disabled={savingId === u.id}
                    onValueChange={(v) => handleChange(u.id, v as AppRole)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Administrador: acesso total, incluindo permissões e sincronização. Gestor: acesso
          operacional e à saúde do ETL. Visualizador: somente leitura dos painéis.
        </p>
      </Panel>
    </div>
  );
}
