export interface AderenciaResult {
  pct: number;
  finalizadasNoPrazo: number;
  finalizadasForaPrazo: number;
  canceladas: number;
  pendentes: number;
  totalProgramadas: number;
}

/**
 * Calcula aderência à programação de manutenção.
 *
 * Fórmula: (finalizadas + canceladas) / total programadas × 100
 * - finalizadasNoPrazo: finalizadas sem DataReprogramada
 * - finalizadasForaPrazo: finalizadas com DataReprogramada preenchida
 * - canceladas: neutras (entram no numerador mas não como falha)
 * - pendentes: programadas, em execução, pausadas, atrasadas, reprogramadas (não finalizadas nem canceladas)
 */
export function computeAderencia(
  rows: {
    Status: string;
    StatusExecucao: string;
    DataProgramada: string;
    DataReprogramada: string;
  }[],
): AderenciaResult {
  let total = 0;
  let okPrazo = 0;
  let foraPrazo = 0;
  let canceladas = 0;
  for (const r of rows) {
    if (!r.DataProgramada) continue;
    total++;
    const raw = (r.StatusExecucao || r.Status || "").toLowerCase();
    if (/cancel/.test(raw)) {
      canceladas++;
      continue;
    }
    const finalizada = /finaliz|conclu/.test(raw);
    if (finalizada) {
      const reprog = (r.DataReprogramada || "").trim();
      if (reprog) foraPrazo++;
      else okPrazo++;
    }
  }
  const pendentes = total - okPrazo - foraPrazo - canceladas;
  const realizadas = okPrazo + foraPrazo + canceladas;
  const pct = total > 0 ? (realizadas / total) * 100 : 0;
  return {
    pct,
    finalizadasNoPrazo: okPrazo,
    finalizadasForaPrazo: foraPrazo,
    canceladas,
    pendentes,
    totalProgramadas: total,
  };
}
