import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Image, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { downloadCsv, type CsvColumn } from "@/lib/export-csv";
import {
  exportTableToPdf,
  exportVisualPdf,
  DEFAULT_MARGINS,
  type VisualPdfQuality,
  type PdfMargins,
} from "@/lib/export-pdf";

interface Props<T> {
  filename: string;
  rows: T[];
  columns: CsvColumn<T>[];
  pdfTitle?: string;
  pdfSubtitle?: string;
  pdfTargetRef?: React.RefObject<HTMLElement | null>;
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
  const [customOpen, setCustomOpen] = useState(false);
  const [format, setFormat] = useState<"tabela" | "visual">(pdfTargetRef ? "visual" : "tabela");
  const [quality, setQuality] = useState<VisualPdfQuality>("medium");
  const [margins, setMargins] = useState<PdfMargins>({ ...DEFAULT_MARGINS });
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  const handleCsv = () => {
    if (rows.length === 0) return;
    downloadCsv(filename, rows, columns);
  };

  const runTable = () =>
    exportTableToPdf({
      filename,
      title: pdfTitle ?? filename,
      subtitle: pdfSubtitle,
      rows,
      columns,
      layout: { margins, showHeader, showFooter, showPageNumbers },
    });

  const runVisual = async (q: VisualPdfQuality = quality) => {
    const el = pdfTargetRef?.current;
    if (!el) {
      toast.error("Nada para exportar");
      return;
    }
    await exportVisualPdf(el, filename, pdfTitle ?? filename, pdfSubtitle, {
      quality: q,
      margins,
      showHeader,
      showFooter,
      showPageNumbers,
    });
  };

  const handlePdfTable = () => {
    if (rows.length === 0) return;
    // Reset margins to defaults for quick action
    exportTableToPdf({
      filename,
      title: pdfTitle ?? filename,
      subtitle: pdfSubtitle,
      rows,
      columns,
    });
  };

  const handleQuickVisual = async (q: VisualPdfQuality) => {
    const el = pdfTargetRef?.current;
    if (!el) {
      toast.error("Nada para exportar");
      return;
    }
    try {
      await exportVisualPdf(el, filename, pdfTitle ?? filename, pdfSubtitle, { quality: q });
      toast.success(`PDF visual (${q}) exportado`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro PDF visual:", err);
      if (rows.length > 0) {
        toast.warning(`PDF visual falhou: ${msg}. Gerando PDF tabular…`);
        try {
          exportTableToPdf({
            filename,
            title: pdfTitle ?? filename,
            subtitle: pdfSubtitle,
            rows,
            columns,
          });
          return;
        } catch (e2) {
          console.error(e2);
        }
      }
      toast.error(`Erro ao gerar PDF: ${msg}`);
    }
  };

  const handleCustomRun = async () => {
    try {
      if (format === "tabela") {
        if (rows.length === 0) {
          toast.error("Sem registros para exportar");
          return;
        }
        runTable();
        toast.success("PDF tabular exportado");
      } else {
        await runVisual();
        toast.success(`PDF visual (${quality}) exportado`);
      }
      setCustomOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao gerar PDF: ${msg}`);
    }
  };

  return (
    <>
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
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleQuickVisual("high")} className="gap-2 text-xs">
                <Image className="h-3.5 w-3.5 text-primary" />
                PDF Visual · Alta qualidade
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickVisual("medium")} className="gap-2 text-xs">
                <Image className="h-3.5 w-3.5 text-primary" />
                PDF Visual · Média (recomendado)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickVisual("low")} className="gap-2 text-xs">
                <Image className="h-3.5 w-3.5 text-primary" />
                PDF Visual · Baixa (arquivo menor)
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCustomOpen(true)} className="gap-2 text-xs">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
            Personalizar PDF…
          </DropdownMenuItem>
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

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Personalizar PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Formato</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as "tabela" | "visual")}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tabela" className="text-xs">Tabela (dados)</SelectItem>
                  {pdfTargetRef && <SelectItem value="visual" className="text-xs">Visual (snapshot)</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {format === "visual" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Qualidade da imagem</Label>
                <Select value={quality} onValueChange={(v) => setQuality(v as VisualPdfQuality)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high" className="text-xs">Alta (nítido, arquivo grande)</SelectItem>
                    <SelectItem value="medium" className="text-xs">Média (recomendado)</SelectItem>
                    <SelectItem value="low" className="text-xs">Baixa (arquivo pequeno)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3 rounded-md border border-border/60 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Margens (mm)
              </div>
              {(["top", "bottom", "left", "right"] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs capitalize">
                      {key === "top" ? "Superior" : key === "bottom" ? "Inferior" : key === "left" ? "Esquerda" : "Direita"}
                    </Label>
                    <span className="num text-[11px] text-muted-foreground">{margins[key]} mm</span>
                  </div>
                  <Slider
                    min={5}
                    max={30}
                    step={1}
                    value={[margins[key]]}
                    onValueChange={([v]) => setMargins((m) => ({ ...m, [key]: v }))}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Cabeçalho</Label>
                <Switch checked={showHeader} onCheckedChange={setShowHeader} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rodapé</Label>
                <Switch checked={showFooter} onCheckedChange={setShowFooter} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Página X de Y</Label>
                <Switch checked={showPageNumbers} onCheckedChange={setShowPageNumbers} disabled={!showFooter} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCustomOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCustomRun}>
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
