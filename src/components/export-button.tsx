import { Download, FileText, FileSpreadsheet, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { downloadCsv, type CsvColumn } from "@/lib/export-csv";
import { exportTableToPdf, exportVisualPdf } from "@/lib/export-pdf";

interface Props<T> {
  filename: string;
  rows: T[];
  columns: CsvColumn<T>[];
  /** Title shown in PDF header */
  pdfTitle?: string;
  /** Subtitle below title in PDF */
  pdfSubtitle?: string;
  /** Captures the DOM visually via html2canvas when provided */
  pdfTargetRef?: React.RefObject<HTMLElement | null>;
  /** When provided, shows a "Resumo Executivo" option */
  onExecutiveSummary?: () => void;
  disabled?: boolean;
}

export function ExportButton<T>({
  filename,
  rows,
  columns,
  pdfTitle,
  pdfSubtitle,
  pdfTargetRef,
  onExecutiveSummary,
  disabled,
}: Props<T>) {
  const handleCsv = () => {
    if (rows.length === 0) return;
    downloadCsv(filename, rows, columns);
  };

  const handlePdfTable = () => {
    if (rows.length === 0) return;
    exportTableToPdf({
      filename,
      title: pdfTitle ?? filename,
      subtitle: pdfSubtitle,
      rows,
      columns,
    });
  };

  const handlePdfVisual = async () => {
    const el = pdfTargetRef?.current;
    if (!el) {
      toast.error("Nada para exportar");
      return;
    }
    try {
      await exportVisualPdf(el, filename, pdfTitle ?? filename, pdfSubtitle);
      toast.success("PDF visual exportado com sucesso");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao exportar PDF visual:", err);
      // Fallback para PDF tabular se possível
      if (rows.length > 0) {
        toast.warning("PDF visual falhou. Gerando PDF tabular…");
        try {
          exportTableToPdf({
            filename,
            title: pdfTitle ?? filename,
            subtitle: pdfSubtitle,
            rows,
            columns,
          });
          return;
        } catch (fallbackErr) {
          console.error("Fallback PDF tabular também falhou:", fallbackErr);
        }
      }
      toast.error(`Erro ao gerar PDF: ${msg}`);
    }
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || rows.length === 0}
          title={rows.length === 0 ? "Nenhum registro para exportar" : undefined}
          className="clay-sm h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={handleCsv} className="gap-2 text-xs">
          <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePdfTable} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-destructive" />
          Exportar PDF (Tabela)
        </DropdownMenuItem>
        {pdfTargetRef && (
          <DropdownMenuItem onClick={handlePdfVisual} className="gap-2 text-xs">
            <Image className="h-3.5 w-3.5 text-primary" />
            Exportar PDF (Visual)
          </DropdownMenuItem>
        )}
        {onExecutiveSummary && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExecutiveSummary} className="gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-warning" />
              Exportar Resumo Executivo
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
