/** Mapeia avisos de colunas ausentes da planilha para o impacto em cada tela. */

export type MissingColumns = {
  aba: string;
  abaLabel: string;
  colunas: string[];
  telas: string[];
  impacto: string;
};

const SHEET_META: Record<string, { label: string; telas: string[]; impacto: string }> = {
  programacao: {
    label: "PROGRAMAÇÃO",
    telas: ["Visão Geral", "Programação", "HH Semanal", "Relatórios", "Indicadores"],
    impacto: "Campos vazios nas OS; KPIs de aderência e HH podem ficar subestimados.",
  },
  medicoes: {
    label: "MEDIÇÕES",
    telas: ["Temperaturas", "Visão Geral"],
    impacto: "Sensores sem leitura aparecem como “—”; alertas dessas colunas não são gerados.",
  },
  passagemTurno: {
    label: "PASSAGEM DE TURNO",
    telas: ["Passagem de Turno"],
    impacto: "Colunas exibidas em branco no histórico de turnos.",
  },
  tecnicos: {
    label: "TÉCNICOS",
    telas: ["Equipe"],
    impacto: "Dados do time incompletos (cargo, turno ou identificação).",
  },
  parametrosHH: {
    label: "PARÂMETROS HH",
    telas: ["HH Semanal", "Indicadores"],
    impacto: "Capacidade de HH pode usar valor padrão em vez do parametrizado.",
  },
  backlog: {
    label: "BACKLOG",
    telas: ["Backlog", "Matriz de Priorização"],
    impacto: "Priorização e responsáveis do backlog ficam sem informação.",
  },
  preditiva: {
    label: "PREDITIVA",
    telas: ["Preditivas"],
    impacto: "Relatórios preditivos exibidos parcialmente.",
  },
  nc: {
    label: "NC",
    telas: ["NC"],
    impacto: "Não conformidades exibidas sem parte dos campos.",
  },
};

/** Converte warnings do formato "[aba] Colunas ausentes: a, b" em itens estruturados. */
export function parseWarnings(warnings: string[]): MissingColumns[] {
  const out: MissingColumns[] = [];
  for (const w of warnings) {
    const match = /^\[(.+?)\]\s*Colunas ausentes:\s*(.+)$/.exec(w);
    if (!match) continue;
    const aba = match[1];
    const colunas = match[2]
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const meta = SHEET_META[aba];
    out.push({
      aba,
      abaLabel: meta?.label ?? aba.toUpperCase(),
      colunas,
      telas: meta?.telas ?? [],
      impacto: meta?.impacto ?? "Campos correspondentes ficam vazios nas telas que usam esta aba.",
    });
  }
  return out;
}
