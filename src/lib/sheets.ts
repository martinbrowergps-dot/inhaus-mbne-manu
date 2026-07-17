import Papa from "papaparse";
import { queryOptions } from "@tanstack/react-query";
import type {
  BacklogRow,
  ChecklistRow,
  MedicaoRow,
  NcRow,
  ParametroHHRow,
  PassagemTurnoRow,
  PlanoManutencaoRow,
  PreditivaRow,
  ProgramacaoRow,
  SheetsData,
  TecnicoRow,
} from "./sheets-types";
import { parseBRNumber, parseBRNumberOrNull } from "./format";

const SHEET_ID = "1WmfsQ0ATzSnuS3gkQKGbUAE623NKGHuHUPJ2SjihQmA";

const SHEETS = {
  programacao: "PROGRAMAÇÃO",
  medicoes: "MEDIÇÕES",
  checklistDocas: "CHECKLIST DOCAS",
  checklistGeral: "CHECKLIST GERAL",
  checklistPortas: "CHECKLIST PORTAS",
  passagemTurno: "PASSAGEM DE TURNO",
  tecnicos: "TECNICOS",
  parametrosHH: "PARAMETROS_HH",
  backlog: "BACKLOG",
  nc: "NC",
  preditiva: "PREDITIVA",
  planoManutencao: "PLANO DE MANUTENÇÃO",
} as const;

function csvUrl(sheet: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
}

function logSheetError(sheet: string, err: unknown) {
  console.error(`[sheets] Falha ao carregar aba "${sheet}":`, err);
}

async function fetchCsv(sheet: string): Promise<Record<string, string>[]> {
  const res = await fetch(csvUrl(sheet), { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao ler aba "${sheet}" (${res.status})`);
  const text = await res.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return parsed.data.filter((r) => Object.values(r).some((v) => v && String(v).trim() !== ""));
}

// NC aba usa layout relatório: primeira linha do CSV do gviz concatena
// rótulo + conteúdo, dados ficam em tabela de 8 colunas posicionais.
// Colunas esperadas: [NUMERO DE NC, OCORRÊNCIA, MEDIDAS CORRETIVAS,
// RESP PELA MEDIDA CORRETIVA, DATA CONCLUSÃO, ANDAMENTO, O QUE FAZER, STATUS].
// Se layout mudar, atualizar mapeamento abaixo E EXPECTED_HEADERS.nc.
const NC_COL_INDEX = {
  Codigo: 0,
  Ocorrencia: 1,
  MedidasCorretivas: 2,
  Responsavel: 3,
  DataConclusao: 4,
  Andamento: 5,
  OQueFazer: 6,
  Status: 7,
} as const;
const NC_EXPECTED_COLS = 8;

async function fetchNcRows(): Promise<NcRow[]> {
  const res = await fetch(csvUrl(SHEETS.nc), { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao ler aba "NC" (${res.status})`);
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });
  const rows = parsed.data as string[][];
  if (rows.length > 0 && (rows[0] ?? []).length < NC_EXPECTED_COLS) {
    console.error(
      `[NC] Esperadas >= ${NC_EXPECTED_COLS} colunas; detectado ${(rows[0] ?? []).length}. Parser posicional desatualizado.`,
    );
    throw new Error(
      `Aba NC: esperadas ${NC_EXPECTED_COLS} colunas, recebidas ${(rows[0] ?? []).length}. Verifique layout da planilha.`,
    );
  }
  const result: NcRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i] ?? [];
    if (c.length < NC_EXPECTED_COLS) continue;
    const numero = (c[NC_COL_INDEX.Codigo] ?? "").trim();
    const ocorrencia = (c[NC_COL_INDEX.Ocorrencia] ?? "").trim();
    const medidas = (c[NC_COL_INDEX.MedidasCorretivas] ?? "").trim();
    const resp = (c[NC_COL_INDEX.Responsavel] ?? "").trim();
    const dataConc = (c[NC_COL_INDEX.DataConclusao] ?? "").trim();
    const andamento = (c[NC_COL_INDEX.Andamento] ?? "").trim();
    const oQueFazer = (c[NC_COL_INDEX.OQueFazer] ?? "").trim();
    const status = (c[NC_COL_INDEX.Status] ?? "").trim();
    // Pula cabeçalho/rótulo e "NC em destaque" (formato formulário)
    if (!ocorrencia) continue;
    if (
      ocorrencia.toUpperCase().startsWith("OCORRÊNCIA") ||
      ocorrencia.toUpperCase().startsWith("RESP PELA MEDIDA CORRETIVA") ||
      numero.toUpperCase().startsWith("NUMERO DE NC")
    )
      continue;
    result.push({
      Codigo: numero,
      Ocorrencia: ocorrencia,
      MedidasCorretivas: medidas,
      Responsavel: resp,
      DataConclusao: dataConc,
      Andamento: andamento,
      OQueFazer: oQueFazer,
      Status: status || andamento,
    });
  }
  if (result.length === 0) {
    console.error("[NC] Nenhuma linha válida extraída. Parser pode estar desatualizado.");
    throw new Error("Aba NC: nenhum registro extraído. Verifique layout da planilha.");
  }
  return result;
}

const EXPECTED_HEADERS: Record<string, string[]> = {
  programacao: [
    "NumeroOS",
    "DataProgramada",
    "Sistema",
    "Descricao",
    "Criticidade",
    "Cargo",
    "HH",
    "Status",
    "Executante",
    "StatusExecucao",
  ],
  medicoes: [
    "LOCAL",
    "DATA",
    "HORA",
    "TEMPERATURA 01",
    "TEMPERATURA 02",
    "TEMPERATURA 03",
    "TEMPERATURA 04",
    "TECNICO",
  ],
  passagemTurno: [
    "Data",
    "Turno",
    "Supervisor",
    "EquipeSaida",
    "EquipeEntrada",
    "TecnicoPassa",
    "TecnicoRecebe",
    "HorarioInicio",
    "HorarioTermino",
    "Aprovador",
  ],
  tecnicos: ["ID", "NOME", "Cargo"],
  parametrosHH: ["Cargo", "HH_Dia", "HH_Semana"],
  backlog: [
    "NUMERO",
    "IDENTIFICAÇÃO_DA_SOLICITAÇÃO",
    "Solicitante",
    "DATA_CRIACAO",
    "Assunto",
    "TECNICO",
    "Prioridade",
    "DATA_DE_VENCIMENTO",
    "Estado",
    "Grupo",
  ],
  nc: [
    "NUMERO DE NC",
    "OCORRÊNCIA",
    "MEDIDAS CORRETIVAS",
    "RESP PELA MEDIDA CORRETIVA",
    "DATA CONCLUSÃO",
    "ANDAMENTO",
    "O QUE FAZER",
    "STATUS",
  ],
  preditiva: [
    "Código Referência",
    "Data",
    "Tipo",
    "Categoria",
    "Prioridade",
    "Título",
    "Objetivo",
    "Área",
    "Setor",
    "Conjunto",
    "Serviço",
    "Descrição da Atividade",
    "HH",
    "Status",
    "Situação",
  ],
};

function validateHeaders(sheetName: string, rows: Record<string, string>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const expected = EXPECTED_HEADERS[sheetName];
  if (!expected) return;
  const missing = expected.filter(
    (h) => !headers.some((ch) => ch.toLowerCase() === h.toLowerCase()),
  );
  if (missing.length > 0) {
    console.warn(
      `[${sheetName}] Colunas esperadas ausentes: ${missing.join(", ")}. Headers recebidos: ${headers.join(", ")}`,
    );
  }
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

export async function fetchSheetsData(): Promise<SheetsData> {
  const errors: string[] = [];

  const [
    programacaoRaw,
    medicoesRaw,
    docasRaw,
    geralRaw,
    portasRaw,
    passagemRaw,
    tecnicosRaw,
    parametrosRaw,
    backlogRaw,
    ncRows,
    preditivaRaw,
    planoRaw,
  ] = await Promise.all([
    fetchCsv(SHEETS.programacao),
    fetchCsv(SHEETS.medicoes),
    fetchCsv(SHEETS.checklistDocas),
    fetchCsv(SHEETS.checklistGeral),
    fetchCsv(SHEETS.checklistPortas),
    fetchCsv(SHEETS.passagemTurno),
    fetchCsv(SHEETS.tecnicos),
    fetchCsv(SHEETS.parametrosHH),
    fetchCsv(SHEETS.backlog).catch((e) => {
      logSheetError(SHEETS.backlog, e);
      errors.push(`BACKLOG: falha ao carregar`);
      return [] as Record<string, string>[];
    }),
    fetchNcRows().catch((e) => {
      logSheetError(SHEETS.nc, e);
      errors.push(`NC: falha ao carregar`);
      return [] as NcRow[];
    }),
    fetchCsv(SHEETS.preditiva).catch((e) => {
      logSheetError(SHEETS.preditiva, e);
      errors.push(`PREDITIVA: falha ao carregar`);
      return [] as Record<string, string>[];
    }),
    fetchCsv(SHEETS.planoManutencao).catch((e) => {
      logSheetError(SHEETS.planoManutencao, e);
      errors.push(`PLANO DE MANUTENÇÃO: falha ao carregar`);
      return [] as Record<string, string>[];
    }),
  ]);

  validateHeaders("programacao", programacaoRaw);
  validateHeaders("medicoes", medicoesRaw);
  validateHeaders("passagemTurno", passagemRaw);
  validateHeaders("tecnicos", tecnicosRaw);
  validateHeaders("parametrosHH", parametrosRaw);
  validateHeaders("backlog", backlogRaw);
  validateHeaders("preditiva", preditivaRaw);

  const programacao: ProgramacaoRow[] = programacaoRaw.map((r) => ({
    NumeroOS: pick(r, "NumeroOS"),
    IDPlano: pick(r, "IDPlano"),
    DataProgramada: pick(r, "DataProgramada"),
    DataReprogramada: pick(r, "DataReprogramada"),
    TAG: pick(r, "TAG"),
    Descricao: pick(r, "Descricao"),
    Sistema: pick(r, "Sistema"),
    Criticidade: pick(r, "Criticidade"),
    Cargo: pick(r, "Cargo"),
    HH: parseBRNumber(r["HH"]),
    Status: pick(r, "Status"),
    Executante: pick(r, "Executante"),
    StatusExecucao: pick(r, "StatusExecucao") || pick(r, "Status"),
    LocalMacro: pick(r, "LocalMacro"),
    Localidade: pick(r, "Localidade"),
    Tipo: pick(r, "Tipo"),
    SolicitanteQuebra: pick(r, "Solicitante da Quebra de Programação", "SolicitanteQuebra"),
    TempoRealExec: parseBRNumber(r["Tempo Real de Execução"] ?? r["TempoRealExec"]),
    DataCriacao: pick(r, "DataCriacao"),
    DataInicioExecucao: pick(r, "DataInicioExecucao"),
    DataFimExecucao: pick(r, "DataFimExecucao"),
    ObservacoesExecucao: pick(r, "ObservacoesExecucao"),
    TemNaoConformidade: pick(r, "TemNaoConformidade"),
    DescricaoNaoConformidade: pick(r, "DescricaoNaoConformidade"),
  }));

  const medicoes: MedicaoRow[] = medicoesRaw.map((r) => ({
    LOCAL: pick(r, "LOCAL", "Local"),
    DATA: pick(r, "DATA", "Data"),
    HORA: pick(r, "HORA", "Hora"),
    TEMPERATURA_01: parseBRNumberOrNull(r["TEMPERATURA 01"]),
    TEMPERATURA_02: parseBRNumberOrNull(r["TEMPERATURA 02"]),

    TECNICO: pick(r, "TECNICO", "Tecnico"),
  }));

  const mapChecklist = (rows: Record<string, string>[]): ChecklistRow[] =>
    rows.map((r) => ({
      ID: pick(r, "ID"),
      Data: pick(r, "Data", "Data/Hora inicio", "Data/Hora Inicio"),
      Local: pick(r, "Local", "Unidade"),
      Responsavel: pick(r, "Responsável", "ResponsavelManutencao", "Responsavel"),
      raw: r,
    }));

  const passagemTurno: PassagemTurnoRow[] = passagemRaw.map((r) => ({
    ID: pick(r, "ID"),
    Data: pick(r, "Data"),
    Turno: pick(r, "Turno"),
    HorarioInicio: pick(r, "HorarioInicio"),
    HorarioTermino: pick(r, "HorarioTermino"),
    Supervisor: pick(r, "Supervisor"),
    EquipeSaida: pick(r, "EquipeSaida", "Equipe Saida"),
    EquipeEntrada: pick(r, "EquipeEntrada", "Equipe Entrada"),
    TecnicoPassa: pick(r, "TecnicoPassa", "Tecnico Passa"),
    TecnicoRecebe: pick(r, "TecnicoRecebe", "Tecnico Recebe"),
    Aprovador: pick(r, "Aprovador"),
    StatusGeral: pick(r, "StatusGeral", "Status Geral", "Status Passagem"),
    Pendencias: pick(r, "Pendencias", "Pendências"),
    Observacoes: pick(r, "Observacoes", "Observações", "Observacoes Gerais"),
    ResumoOcorrencias: pick(r, "Resumo Ocorrencias", "ResumoOcorrencias"),
    ResumoOSAbertas: pick(r, "Resumo OS Abertas", "ResumoOSAbertas"),
    ResumoOSConcluidas: pick(r, "Resumo OS Concluidas", "ResumoOSConcluidas"),
    DataHoraRegistro: pick(r, "DataHoraRegistro"),
    AssinadoPor: pick(r, "Assinado Por", "AssinadoPor"),
  }));

  const tecnicos: TecnicoRow[] = tecnicosRaw.map((r) => ({
    ID: pick(r, "ID"),
    Nome: pick(r, "NOME", "Nome"),
    Cargo: pick(r, "CARGO", "Cargo"),
  }));

  const parametrosHH: ParametroHHRow[] = parametrosRaw.map((r) => ({
    Cargo: pick(r, "Cargo"),
    HH_Dia: parseBRNumber(r["HH_Dia"]),
    HH_Semana: parseBRNumber(r["HH_Semana"]),
  }));

  const backlog: BacklogRow[] = backlogRaw.map((r) => ({
    Numero: pick(r, "NUMERO", "Numero"),
    Identificacao: pick(r, "IDENTIFICAÇÃO_DA_SOLICITAÇÃO", "Identificacao"),
    Solicitante: pick(r, "Solicitante"),
    DataCriacao: pick(r, "DATA_CRIACAO", "DataCriacao"),
    Assunto: pick(r, "Assunto"),
    Tecnico: pick(r, "TECNICO", "Tecnico"),
    Prioridade: pick(r, "Prioridade"),
    DataVencimento: pick(r, "DATA_DE_VENCIMENTO", "DataVencimento"),
    SolicitacaoServico: pick(r, "É_UMA_SOLICITAÇÃO_DE_SERVIÇO"),
    Estado: pick(r, "Estado"),
    Grupo: pick(r, "Grupo"),
    StatusOficial: pick(r, "Status Oficial", "StatusOficial"),
    HHEstimado: parseBRNumber(r["HH Estimado"] ?? r["HHEstimado"]),
    OQuePrecisa: pick(r, "o que precisa", "OQuePrecisa"),
  }));

  const nc: NcRow[] = ncRows;

  const planoManutencao: PlanoManutencaoRow[] = planoRaw.map((r) => ({
    Item: pick(r, "Item"),
    Unidade: pick(r, "Unidade"),
    CodigoUnidade: pick(r, "Código Unidade", "Codigo Unidade"),
    LocalInstalacao: pick(r, "Local de Instalação", "Local de Instalacao"),
    EquipamentoMaquina: pick(r, "Equipamento/Máquina", "Equipamento/Maquina"),
    DescricaoAtividade: pick(r, "Descrição da Atividade", "Descricao da Atividade"),
    Sistema: pick(r, "Sistema"),
    TAG: pick(r, "TAG"),
    Criticidade: pick(r, "Criticidade"),
    Tipo: pick(r, "Tipo"),
    Periodicidade: pick(r, "Periodicidade"),
    Start: pick(r, "Start", "Início", "Inicio"),
    Cargo: pick(r, "Cargo"),
    HHEstimado: pick(r, "HH_Estimado", "HH Estimado"),
    HHEquivalenteTempo: pick(r, "HH_Equivalente_Tempo", "HH Equivalente Tempo"),
  }));

  const preditiva: PreditivaRow[] = preditivaRaw.map((r) => ({
    CodigoReferencia: pick(r, "Código Referência", "CodigoReferencia"),
    Data: pick(r, "Data"),
    Tipo: pick(r, "Tipo"),
    Categoria: pick(r, "Categoria"),
    Prioridade: pick(r, "Prioridade"),
    Titulo: pick(r, "Título", "Titulo"),
    Objetivo: pick(r, "Objetivo"),
    Area: pick(r, "Área", "Area"),
    Setor: pick(r, "Setor"),
    Conjunto: pick(r, "Conjunto"),
    Servico: pick(r, "Serviço", "Servico"),
    DescricaoAtividade: pick(r, "Descrição da Atividade", "DescricaoAtividade"),
    HH: pick(r, "HH"),
    Status: pick(r, "Status"),
    Situacao: pick(r, "Situação", "Situacao"),
  }));

  return {
    programacao,
    medicoes,
    checklistDocas: mapChecklist(docasRaw),
    checklistGeral: mapChecklist(geralRaw),
    checklistPortas: mapChecklist(portasRaw),
    passagemTurno,
    tecnicos,
    parametrosHH,
    backlog,
    nc,
    preditiva,
    planoManutencao,
    fetchedAt: Date.now(),
    errors: errors.length ? errors : undefined,
  };
}

export const sheetsQueryOptions = queryOptions({
  queryKey: ["sheets"],
  queryFn: fetchSheetsData,
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
  refetchOnWindowFocus: false,
});
