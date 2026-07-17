import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SectionHeader } from "@/components/section-header";
import { Panel } from "@/components/panel";
import {
  ClipboardList,
  AlertTriangle,
  Target,
  CalendarCheck,
  Wrench,
  CheckCircle2,
  Flag,
  FileCheck,
  Factory,
  ShieldCheck,
  Gem,
  DollarSign,
  ArrowRight,
  Clock,
  LayoutGrid,
} from "lucide-react";
import { ExportButton } from "@/components/export-button";

export const Route = createFileRoute("/_app/matriz-priorizacao")({
  component: MatrizPriorizacaoPage,
});

const IMPACT_LEVELS = ["Muito Baixo", "Baixo", "Médio", "Alto", "Muito Alto"];
const PROB_LEVELS = ["Muito Alta", "Alta", "Média", "Baixa", "Muito Baixa"];

const HEATMAP: { prob: number; imp: number; label: string; color: string; bg: string }[] = [
  { prob: 0, imp: 0, label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
  { prob: 0, imp: 1, label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
  { prob: 0, imp: 2, label: "P1", color: "#FFFFFF", bg: "#EF4444" },
  { prob: 0, imp: 3, label: "P1", color: "#FFFFFF", bg: "#EF4444" },
  { prob: 0, imp: 4, label: "P1", color: "#FFFFFF", bg: "#EF4444" },
  { prob: 1, imp: 0, label: "P3", color: "#000000", bg: "#EAB308" },
  { prob: 1, imp: 1, label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
  { prob: 1, imp: 2, label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
  { prob: 1, imp: 3, label: "P1", color: "#FFFFFF", bg: "#EF4444" },
  { prob: 1, imp: 4, label: "P1", color: "#FFFFFF", bg: "#EF4444" },
  { prob: 2, imp: 0, label: "P3", color: "#000000", bg: "#EAB308" },
  { prob: 2, imp: 1, label: "P3", color: "#000000", bg: "#EAB308" },
  { prob: 2, imp: 2, label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
  { prob: 2, imp: 3, label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
  { prob: 2, imp: 4, label: "P1", color: "#FFFFFF", bg: "#EF4444" },
  { prob: 3, imp: 0, label: "P4", color: "#FFFFFF", bg: "#10B981" },
  { prob: 3, imp: 1, label: "P3", color: "#000000", bg: "#EAB308" },
  { prob: 3, imp: 2, label: "P3", color: "#000000", bg: "#EAB308" },
  { prob: 3, imp: 3, label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
  { prob: 3, imp: 4, label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
  { prob: 4, imp: 0, label: "P4", color: "#FFFFFF", bg: "#10B981" },
  { prob: 4, imp: 1, label: "P4", color: "#FFFFFF", bg: "#10B981" },
  { prob: 4, imp: 2, label: "P3", color: "#000000", bg: "#EAB308" },
  { prob: 4, imp: 3, label: "P3", color: "#000000", bg: "#EAB308" },
  { prob: 4, imp: 4, label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
];

const FLUXO_ETAPAS = [
  { num: "01", title: "Solicitação da Atividade", icon: ClipboardList },
  { num: "02", title: "Avaliação da Probabilidade", icon: AlertTriangle },
  { num: "03", title: "Avaliação do Impacto", icon: Target },
  { num: "04", title: "Definição da Prioridade", icon: Flag },
  { num: "05", title: "Planejamento", icon: CalendarCheck },
  { num: "06", title: "Programação", icon: CalendarCheck },
  { num: "07", title: "Execução", icon: Wrench },
  { num: "08", title: "Encerramento", icon: CheckCircle2 },
];

const CRITERIOS = [
  {
    icon: Factory,
    title: "Produção",
    desc: "Impacto na continuidade operacional, paradas de linha e capacidade produtiva.",
  },
  {
    icon: Wrench,
    title: "Manutenção",
    desc: "Disponibilidade de recursos internos, ferramentas especiais e necessidade de terceiros.",
  },
  {
    icon: Gem,
    title: "Qualidade",
    desc: "Efeito sobre especificações do produto, conformidade e taxas de refugo/retrabalho.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança",
    desc: "Risco de acidentes, exposição a agentes perigosos e conformidade com normas regulamentadoras.",
  },
  {
    icon: DollarSign,
    title: "Custo",
    desc: "Impacto financeiro direto, perda de insumos e custo de reparo vs. preventiva.",
  },
];

const PRIORIDADES = [
  {
    label: "P1",
    title: "Emergencial",
    prazo: "1 dia útil",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.4)",
  },
  {
    label: "P2",
    title: "Urgente",
    prazo: "3 dias úteis",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.4)",
  },
  {
    label: "P3",
    title: "Padrão",
    prazo: "5 dias úteis",
    color: "#EAB308",
    bg: "rgba(234,179,8,0.15)",
    border: "rgba(234,179,8,0.4)",
  },
  {
    label: "P4",
    title: "Muito Baixo",
    prazo: "Acima de 15 dias",
    color: "#10B981",
    bg: "rgba(16,185,129,0.15)",
    border: "rgba(16,185,129,0.4)",
  },
];

const LEGENDA_CLASSIFICACAO = [
  { label: "P1 - Crítico", color: "#EF4444" },
  { label: "P2 - Alto", color: "#F59E0B" },
  { label: "P3 - Médio", color: "#EAB308" },
  { label: "P4 - Baixo", color: "#10B981" },
];

function MatrizPriorizacaoPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={pageRef} className="page-enter space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            MATRIZ DE PRIORIZAÇÃO DE ATIVIDADES — PCM
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Metodologia baseada em Probabilidade × Impacto para definição de prioridades
          </p>
        </div>
        <ExportButton
          filename="matriz-priorizacao"
          rows={[]}
          columns={[]}
          pdfTargetRef={pageRef}
        />
      </div>

      <SectionHeader label="Fluxo do Processo" insight="8 etapas da solicitação ao encerramento" icon={FileCheck} colorIndex={0}>
        <div className="grid grid-cols-8 gap-2">
          {FLUXO_ETAPAS.map((etapa, i) => (
            <div key={etapa.num} className="flex flex-col items-center gap-2">
              <Panel className="flex w-full flex-col items-center gap-1.5 p-3 text-center" glass>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                  {etapa.num}
                </div>
                <etapa.icon className="h-4 w-4 text-primary" />
                <span className="text-[9px] leading-tight text-foreground">{etapa.title}</span>
              </Panel>
              {i < FLUXO_ETAPAS.length - 1 && (
                <ArrowRight className="hidden h-4 w-4 text-primary/40 lg:block" />
              )}
            </div>
          ))}
        </div>
      </SectionHeader>

      <SectionHeader label="Matriz Probabilidade × Impacto" insight="Classificação P1 a P4 com base na combinação dos fatores" icon={LayoutGrid} colorIndex={1}>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <Panel glass>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[120px_repeat(5,1fr)] gap-px bg-white/5 min-w-[500px]">
                <div className="flex items-center justify-center rounded-tl bg-card p-2 text-[9px] font-bold tracking-[0.12em] text-muted-foreground">
                  Probabilidade \ Impacto
                </div>
                {IMPACT_LEVELS.map((imp) => (
                  <div
                    key={imp}
                    className="flex items-center justify-center bg-card p-2 text-[9px] font-semibold text-primary"
                  >
                    {imp}
                  </div>
                ))}
                {PROB_LEVELS.map((prob, pi) =>
                  [null, ...HEATMAP.filter((c) => c.prob === pi)].flatMap((cell, ci) =>
                    cell === null ? (
                      <div
                        key={`prob-${pi}`}
                        className="flex items-center justify-center bg-card p-2 text-[9px] font-semibold text-muted-foreground"
                      >
                        {prob}
                      </div>
                    ) : (
                      <div
                        key={`${cell.prob}-${cell.imp}`}
                        className="group relative flex items-center justify-center p-2 text-center text-[11px] font-bold transition-opacity hover:opacity-80"
                        style={{ backgroundColor: cell.bg, color: cell.color }}
                      >
                        {cell.label}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[9px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          {PROB_LEVELS[cell.prob]} + {IMPACT_LEVELS[cell.imp]} → {cell.label}
                        </div>
                      </div>
                    ),
                  ),
                )}
              </div>
            </div>
          </Panel>
          <Panel className="flex flex-col gap-2" glass>
            <span className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase">Classificação</span>
            {LEGENDA_CLASSIFICACAO.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-foreground">{item.label}</span>
              </div>
            ))}
          </Panel>
        </div>
      </SectionHeader>

      <SectionHeader label="Critérios de Impacto" insight="Fatores avaliados na determinação do nível de impacto" icon={Target} colorIndex={2}>
        <div className="grid gap-3 sm:grid-cols-5">
          {CRITERIOS.map((criterio) => (
            <Panel key={criterio.title} glass className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <criterio.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[11px] font-bold text-foreground">{criterio.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{criterio.desc}</p>
            </Panel>
          ))}
        </div>
      </SectionHeader>

      <SectionHeader label="Níveis de Prioridade" insight="Prazos de atendimento conforme classificação" icon={Flag} colorIndex={3}>
        <div className="grid gap-3 sm:grid-cols-4">
          {PRIORIDADES.map((pri) => (
            <div
              key={pri.label}
              className="fade-up rounded-xl border p-4"
              style={{ backgroundColor: pri.bg, borderColor: pri.border }}
            >
              <div className="flex flex-col gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: pri.color }}
                >
                  {pri.label}
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: pri.color }}>
                    {pri.title}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Prazo: {pri.prazo}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionHeader>

      <Panel glass className="p-6">
        <div className="flex items-center justify-center gap-1 sm:gap-3">
          {["Solicitação", "Avaliação", "Priorização", "Planejamento", "Execução"].map((step, i) => (
            <div key={step} className="flex items-center gap-1 sm:gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary sm:h-10 sm:w-12 sm:rounded-md sm:text-xs">
                  {i + 1}
                </div>
                <span className="text-[9px] text-muted-foreground sm:text-[11px]">{step}</span>
              </div>
              {i < 4 && (
                <ArrowRight className="h-4 w-4 text-primary/30 sm:h-5 sm:w-8" />
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}




