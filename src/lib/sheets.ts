import Papa from "papaparse";
import { queryOptions } from "@tanstack/react-query";
import type {
  BacklogRow,
  ChecklistRow,
  MedicaoRow,
  NcRow,
  ParametroHHRow,
  PassagemTurnoRow,
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
} as const;

function csvUrl(sheet: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
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

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

export async function fetchSheetsData(): Promise<SheetsData> {
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
    ncRaw,
    preditivaRaw,
  ] = await Promise.all([
    fetchCsv(SHEETS.programacao),
    fetchCsv(SHEETS.medicoes),
    fetchCsv(SHEETS.checklistDocas),
    fetchCsv(SHEETS.checklistGeral),
    fetchCsv(SHEETS.checklistPortas),
    fetchCsv(SHEETS.passagemTurno),
    fetchCsv(SHEETS.tecnicos),
    fetchCsv(SHEETS.parametrosHH),
    fetchCsv(SHEETS.backlog).catch(() => [] as Record<string, string>[]),
    fetchCsv(SHEETS.nc).catch(() => [] as Record<string, string>[]),
    fetchCsv(SHEETS.preditiva).catch(() => [] as Record<string, string>[]),
  ]);

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
    TEMPERATURA_03: parseBRNumberOrNull(r["TEMPERATURA 03"]),
    TEMPERATURA_04: parseBRNumberOrNull(r["TEMPERATURA 04"]),
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

  const nc: NcRow[] = ncRaw.map((r) => ({
    Codigo: pick(r, "Código", "Codigo"),
    Tipo: pick(r, "Tipo"),
    Categoria: pick(r, "Categoria"),
    Prioridade: pick(r, "Prioridade"),
    Titulo: pick(r, "Título", "Titulo"),
    Objetivo: pick(r, "Objetivo"),
    DescricaoAtividade: pick(r, "Descrição da Atividade", "DescricaoAtividade"),
    Procedimento: pick(r, "Procedimento"),
    CriterioAceitacao: pick(r, "Critério de Aceitação", "CriterioAceitacao"),
    evidencias: pick(r, "Evidências", "evidencias"),
    HHEstimado: pick(r, "HH Estimado", "HHEstimado"),
    Responsavel: pick(r, "Responsável", "Responsavel"),
    Status: pick(r, "Status"),
  }));

  const preditiva: PreditivaRow[] = preditivaRaw.map((r) => ({
    CodigoReferencia: pick(r, "Código Referência", "CodigoReferencia"),
    Tipo: pick(r, "Tipo"),
    Categoria: pick(r, "Categoria"),
    Prioridade: pick(r, "Prioridade"),
    Titulo: pick(r, "Título", "Titulo"),
    Objetivo: pick(r, "Objetivo"),
    DescricaoAtividade: pick(r, "Descrição da Atividade", "DescricaoAtividade"),
    HH: pick(r, "HH"),
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
    fetchedAt: Date.now(),
  };
}

export const sheetsQueryOptions = queryOptions({
  queryKey: ["sheets"],
  queryFn: fetchSheetsData,
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
  refetchOnWindowFocus: false,
});
