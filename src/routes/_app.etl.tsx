import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  UserRound,
  Timer,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useRole } from "@/hooks/use-role";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataErrorState } from "@/components/data-error-state";
import { sheetsQueryOptions } from "@/lib/sheets";
import { syncSheetsNow } from "@/lib/sync-sheets.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatBRDateTime } from "@/lib/format";
import { parseWarnings } from "@/lib/etl-impact";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/etl")({
  component: EtlPage,
  head: () => ({
    meta: [
      { title: "Saúde do ETL | Martin Brower CDNE" },
      {
        name: "description",
        content:
          "Monitore a sincronização da planilha: última execução, status do cron de 5 minutos, colunas ausentes e histórico de sincronizações.",
      },
      { property: "og:title", content: "Saúde do ETL | Martin Brower CDNE" },
      {
        property: "og:description",
        content: "Status da sincronização de dados, falhas e histórico de auditoria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type SyncLogRow = {
  id: string;
  origem: string;
  user_email: string | null;
  sucesso: boolean;
  erro: string | null;
  duracao_ms: number | null;
  counts: Record<string, number> | null;
  warnings: string[] | null;
  created_at: string;
};

const syncLogQuery = {
  queryKey: ["sync_log"],
  queryFn: async (): Promise<SyncLogRow[]> => {
    const { data, error } = await supabase
      .from("sync_log")
      .select("id, origem, user_email, sucesso, erro, duracao_ms, counts, warnings, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as SyncLogRow[];
  },
  refetchInterval: 60_000,
};

function minutesAgo(iso: string | number | null) {
  if (iso === null) return null;
  const t = typeof iso === "number" ? iso : new Date(iso).getTime();
  return Math.max(0, Math.floor((Date.now() - t) / 60_000));
}

function EtlPage() {
  const qc = useQueryClient();
  const { isGestor, isLoading: roleLoading } = useRole();
  const sheets = useQuery(sheetsQueryOptions);
  const logs = useQuery({ ...syncLogQuery, enabled: isGestor });
  const [syncing, setSyncing] = useState(false);

  const lastCron = useMemo(
    () => (logs.data ?? []).find((l) => l.origem === "cron") ?? null,
    [logs.data],
  );
  const lastLog = logs.data?.[0] ?? null;
  const missing = useMemo(() => parseWarnings(sheets.data?.warnings ?? []), [sheets.data]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncSheetsNow();
      toast.success("Sincronização concluída");
    } catch (err) {
      toast.error(
        `Falha na sincronização: ${err instanceof Error ? err.message : "erro desconhecido"}`,
      );
    } finally {
      setSyncing(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sheets"] }),
        qc.invalidateQueries({ queryKey: ["sync_log"] }),
      ]);
    }
  };

  const dataAge = minutesAgo(sheets.data?.fetchedAt ?? null);
  const cronAge = lastCron ? minutesAgo(lastCron.created_at) : null;
  const cronStatus =
    cronAge === null
      ? { label: "Sem registros", tone: "text-muted-foreground" }
      : cronAge <= 10
        ? { label: "Ativo", tone: "text-success" }
        : cronAge <= 30
          ? { label: "Atrasado", tone: "text-warning" }
          : { label: "Parado", tone: "text-destructive" };

  const fails24h = (logs.data ?? []).filter(
    (l) => !l.sucesso && Date.now() - new Date(l.created_at).getTime() < 86_400_000,
  );

  if (roleLoading) {
    return <Skeleton className="h-40" />;
  }

  if (!isGestor) {
    return (
      <div className="space-y-4">
        <PageHeader title="Saúde do ETL" />
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito"
          description="Somente gestores e administradores podem acompanhar a sincronização de dados."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Saúde do ETL"
        subtitle="Sincronização da planilha, colunas ausentes e auditoria das execuções"
        exportButton={
          <Button size="sm" onClick={handleSync} disabled={syncing} className="gap-2">
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="ÚLTIMA SINCRONIZAÇÃO">
          <p className="num text-lg text-foreground">
            {sheets.data ? formatBRDateTime(new Date(sheets.data.fetchedAt)) : "—"}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {dataAge === null ? "Sem dados" : dataAge < 1 ? "agora" : `há ${dataAge} min`}
            {sheets.data?.fromCache ? " · via cache" : " · leitura direta"}
          </p>
        </Panel>

        <Panel title="CRON (5 MIN)">
          <p className={cn("text-lg font-bold", cronStatus.tone)}>{cronStatus.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lastCron
              ? `Última execução automática: ${formatBRDateTime(new Date(lastCron.created_at))}`
              : "Nenhuma execução automática registrada ainda"}
          </p>
        </Panel>

        <Panel title="FALHAS (24H)">
          <p
            className={cn(
              "num text-lg font-bold",
              fails24h.length > 0 ? "text-destructive" : "text-success",
            )}
          >
            {logs.isLoading ? "—" : fails24h.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lastLog
              ? lastLog.sucesso
                ? "Última execução com sucesso"
                : "Última execução falhou"
              : "Sem histórico"}
          </p>
        </Panel>

        <Panel title="COLUNAS AUSENTES">
          <p
            className={cn(
              "num text-lg font-bold",
              missing.length > 0 ? "text-warning" : "text-success",
            )}
          >
            {missing.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {missing.length > 0 ? "abas com campos faltando" : "todas as abas completas"}
          </p>
        </Panel>
      </div>

      <Panel title="VALIDAÇÃO DA PLANILHA" subtitle="Colunas ausentes e impacto por tela">
        {sheets.isLoading ? (
          <Skeleton className="h-24" />
        ) : sheets.isError ? (
          <DataErrorState error={sheets.error} onRetry={() => sheets.refetch()} />
        ) : missing.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Nenhuma coluna esperada está faltando nas abas monitoradas.
          </div>
        ) : (
          <div className="space-y-3">
            {missing.map((m) => (
              <div key={m.aba} className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                  <span className="text-sm font-bold tracking-wider text-warning">
                    {m.abaLabel}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.colunas.map((c) => (
                    <span
                      key={c}
                      className="rounded border border-border/60 bg-background/60 px-1.5 py-0.5 text-[11px] text-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{m.impacto}</p>
                {m.telas.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold">Telas afetadas:</span> {m.telas.join(", ")}
                  </p>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Correção: adicionar as colunas com o mesmo nome na planilha de origem. O app não
              inventa valores — os campos permanecem vazios até a planilha ser ajustada.
            </p>
          </div>
        )}
      </Panel>

      <Panel
        title="HISTÓRICO DE SINCRONIZAÇÕES"
        subtitle="Últimas 50 execuções (manuais e automáticas)"
        action={
          <Button size="sm" variant="outline" onClick={() => logs.refetch()} className="gap-2">
            <RefreshCw className={cn("h-3.5 w-3.5", logs.isFetching && "animate-spin")} />
            Atualizar
          </Button>
        }
      >
        {logs.isLoading ? (
          <Skeleton className="h-40" />
        ) : logs.isError ? (
          <DataErrorState error={logs.error} onRetry={() => logs.refetch()} />
        ) : (logs.data ?? []).length === 0 ? (
          <EmptyState
            title="Nenhuma sincronização registrada"
            description="O histórico começa a ser gravado a partir da próxima execução do ETL."
          />
        ) : (
          <div className="space-y-2">
            {(logs.data ?? []).map((l) => (
              <div
                key={l.id}
                className={cn(
                  "rounded-lg border p-3 text-xs",
                  l.sucesso
                    ? "border-border/50 bg-card/40"
                    : "border-destructive/40 bg-destructive/5",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {l.sucesso ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="num text-foreground">
                    {formatBRDateTime(new Date(l.created_at))}
                  </span>
                  <span className="rounded border border-border/60 px-1.5 py-0.5 tracking-wider uppercase text-muted-foreground">
                    {l.origem === "cron" ? "Automática" : "Manual"}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <UserRound className="h-3 w-3" />
                    {l.user_email ?? (l.origem === "cron" ? "sistema (cron)" : "—")}
                  </span>
                  {l.duracao_ms !== null && (
                    <span className="num flex items-center gap-1 text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      {(l.duracao_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                  {l.counts && (
                    <span className="num flex items-center gap-1 text-muted-foreground">
                      <Database className="h-3 w-3" />
                      {Object.values(l.counts).reduce((a, b) => a + b, 0)} registros
                    </span>
                  )}
                </div>
                {!l.sucesso && l.erro && (
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <p className="break-words text-destructive">{l.erro}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSync}
                      disabled={syncing}
                      className="shrink-0 gap-1.5"
                    >
                      <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
                      Retry
                    </Button>
                  </div>
                )}
                {l.warnings && l.warnings.length > 0 && (
                  <p className="mt-1 text-warning">{l.warnings.length} aviso(s) na planilha</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
