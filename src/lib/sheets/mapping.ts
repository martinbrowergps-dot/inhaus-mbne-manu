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
  TecnicoRow,
} from "../sheets-types";
import { parseBRNumber, parseNumberSafeOrNull } from "../format";

export function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

export const mapProgramacao = (r: Record<string, string>): ProgramacaoRow => ({
  NumeroOS: pick(r, "NumeroOS", "Número da OS"),
  IDPlano: pick(r, "IDPlano", "ID do Plano"),
  DataProgramada: pick(r, "DataProgramada", "Data Programada"),
  DataReprogramada: pick(r, "DataReprogramada", "Data Reprogramada"),
  TAG: pick(r, "TAG", "Tag do Equipamento"),
  Descricao: pick(r, "Descricao", "Descrição da OS"),
  Sistema: pick(r, "Sistema", "Subsistema"),
  Criticidade: pick(r, "Criticidade", "Prioridade"),
  Cargo: pick(r, "Cargo", "Especialidade"),
  HH: parseBRNumber(pick(r, "HH", "Horas Estimadas")),
  Status: pick(r, "Status"),
  Executante: pick(r, "Executante", "Técnico Responsável"),
  StatusExecucao: pick(r, "StatusExecucao", "Status de Execução") || pick(r, "Status"),
  LocalMacro: pick(r, "LocalMacro", "Área"),
  Localidade: pick(r, "Localidade", "Setor"),
  Tipo: pick(r, "Tipo", "Tipo de Manutenção"),
  SolicitanteQuebra: pick(r, "Solicitante da Quebra de Programação", "SolicitanteQuebra", "Solicitante"),
  TempoRealExec: parseBRNumber(pick(r, "Tempo Real de Execução", "TempoRealExec", "Horas Reais")),
  DataCriacao: pick(r, "DataCriacao", "Data de Abertura"),
  DataInicioExecucao: pick(r, "DataInicioExecucao", "Início Real"),
  DataFimExecucao: pick(r, "DataFimExecucao", "Fim Real"),
  ObservacoesExecucao: pick(r, "ObservacoesExecucao", "Observações"),
  TemNaoConformidade: pick(r, "TemNaoConformidade", "NC Gerada?"),
  DescricaoNaoConformidade: pick(r, "DescricaoNaoConformidade", "Detalhes NC"),
});

export const mapMedicao = (r: Record<string, string>): MedicaoRow => ({
  LOCAL: pick(r, "LOCAL", "Local"),
  DATA: pick(r, "DATA", "Data"),
  HORA: pick(r, "HORA", "Hora"),
  TEMPERATURA_01: parseNumberSafeOrNull(pick(r, "TEMPERATURA 01", "TEMPERATURA_01")),
  TEMPERATURA_02: parseNumberSafeOrNull(pick(r, "TEMPERATURA 02", "TEMPERATURA_02")),
  TECNICO: pick(r, "TECNICO", "Tecnico"),
});

export const mapChecklist = (r: Record<string, string>): ChecklistRow => ({
  ID: pick(r, "ID"),
  Data: pick(r, "Data", "Data/Hora inicio", "Data/Hora Inicio"),
  Local: pick(r, "Local", "Unidade"),
  Responsavel: pick(r, "Responsável", "ResponsavelManutencao", "Responsavel"),
  raw: r,
});

export const mapPassagemTurno = (r: Record<string, string>): PassagemTurnoRow => ({
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
});

export const mapTecnico = (r: Record<string, string>): TecnicoRow => ({
  ID: pick(r, "ID"),
  Nome: pick(r, "NOME", "Nome"),
  Cargo: pick(r, "CARGO", "Cargo"),
});

export const mapParametroHH = (r: Record<string, string>): ParametroHHRow => ({
  Cargo: pick(r, "Cargo"),
  HH_Dia: parseBRNumber(r["HH_Dia"]),
  HH_Semana: parseBRNumber(r["HH_Semana"]),
});

export const mapBacklog = (r: Record<string, string>): BacklogRow => ({
  Numero: pick(r, "NUMERO", "Numero", "Nº OS"),
  Identificacao: pick(r, "IDENTIFICAÇÃO_DA_SOLICITAÇÃO", "Identificacao", "ID Solicitação"),
  Solicitante: pick(r, "Solicitante", "Quem solicitou"),
  DataCriacao: pick(r, "DATA_CRIACAO", "DataCriacao", "Aberto em"),
  Assunto: pick(r, "Assunto", "Título"),
  Tecnico: pick(r, "TECNICO", "Tecnico", "Responsável"),
  Prioridade: pick(r, "Prioridade", "Criticidade"),
  DataVencimento: pick(r, "DATA_DE_VENCIMENTO", "DataVencimento", "Vence em"),
  SolicitacaoServico: pick(r, "É_UMA_SOLICITAÇÃO_DE_SERVIÇO", "Solicitação de Serviço"),
  Estado: pick(r, "Estado", "Status"),
  Grupo: pick(r, "Grupo", "Time"),
  StatusOficial: pick(r, "Status Oficial", "StatusOficial"),
  HHEstimado: parseBRNumber(pick(r, "HH Estimado", "HHEstimado", "Horas")),
  OQuePrecisa: pick(r, "o que precisa", "OQuePrecisa", "Pendência Material"),
});

export const mapPlanoManutencao = (r: Record<string, string>): PlanoManutencaoRow => ({
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
});

export const mapPreditiva = (r: Record<string, string>): PreditivaRow => ({
  Area: pick(r, "Área", "Area"),
  Setor: pick(r, "Setor"),
  Conjunto: pick(r, "Conjunto"),
  TipoEquipamento: pick(r, "Tipo de Equipamento", "TipoEquipamento"),
  Equipamento: pick(r, "Equipamento"),
  Data: pick(r, "Data"),
  NumeroRelatorio: pick(r, "Nº Relatório!", "NumeroRelatorio"),
  Servico: pick(r, "Serviço", "Servico"),
  Status: pick(r, "Status"),
  Acoes: pick(r, "Ações", "Acoes"),
});
