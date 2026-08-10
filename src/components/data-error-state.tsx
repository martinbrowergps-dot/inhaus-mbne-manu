import { AlertTriangle, RefreshCw } from "lucide-react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";

export function DataErrorState({
  error,
  onRetry,
  title = "ERRO AO CARREGAR DADOS",
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const message = error instanceof Error ? error.message : undefined;
  return (
    <Panel title={title}>
      <div className="flex flex-col items-start gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar os dados da planilha. Verifique a conexão ou se a planilha
              continua pública.
            </p>
            {message && <p className="mt-2 text-xs break-words text-destructive">{message}</p>}
          </div>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        )}
      </div>
    </Panel>
  );
}
