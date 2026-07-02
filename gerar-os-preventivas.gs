// =============================================================
// GERAR OS PREVENTIVAS — Martin Brower
// v5.11 — Correção: usa fuso da planilha em vez do fuso do script
// =============================================================
//
// CHANGELOG v5.10 → v5.11:
// - [BUG CRÍTICO] O script usava Session.getScriptTimeZone() para
//   calcular o horizonte da semana, mas as datas no PLANO DE MANUTENÇÃO
//   estão no fuso da planilha (America/Los_Angeles). Com 4h de diferença
//   para America/Sao_Paulo, as datas podiam avançar/pular fora da janela
//   prevista, resultando em 0 OS geradas.
//   Correção: tz = ss.getSpreadsheetTimeZone() em todo o fluxo.
//
// =============================================================

// =============================================================
// CONFIGURAÇÕES
// =============================================================

const CONFIG = {
  ABA_PLANO:   'PLANO DE MANUTENÇÃO',
  ABA_OS:      'PROGRAMAÇÃO',
  ABA_PARAMS:  'PARAMETROS_HH',

  TOLERANCIA_DIAS_PERIODICIDADE: 1,

  HH_FALLBACK: 8,

  CAP_DIA_PADRAO:    8,
  CAP_SEMANA_PADRAO: 40,

  APENAS_SEMANA_RAW: ['OFICIAL DE MANUTENÇÃO'],
  APENAS_SEMANA: null,

  EMAIL_NOTIFICACAO_ERRO: '',

  VERBOSE: false,

  COLUNAS_OBRIGATORIAS_PLANO: ['ITEM', 'TAG', 'PERIODICIDADE', 'START', 'CRITICIDADE', 'CARGO'],
};

const ORDEM_CRITICIDADE = { 'AA': 1, 'A': 2, 'C': 3 };

const COLUNAS_OS = [
  'NumeroOS', 'IDPlano', 'DataProgramada', 'DataReprogramada',
  'TAG', 'Descricao', 'LocalMacro', 'Localidade', 'Sistema',
  'Tipo', 'Criticidade', 'Cargo', 'HH', 'Status',
  'DataCriacao', 'DataInicioExecucao', 'Executante',
  'ObservacoesExecucao', 'TemNaoConformidade', 'DescricaoNaoConformidade',
  'FotoAntes', 'FotoDepois', 'FotosAdicionais',
  'DataFimExecucao', 'Assinatura', 'StatusExecucao'
];

// =============================================================
// UTILITÁRIOS GERAIS
// =============================================================

function normalizar(valor) {
  return (valor || '')
    .toString()
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

CONFIG.APENAS_SEMANA = new Set(CONFIG.APENAS_SEMANA_RAW.map(normalizar));

// =============================================================
// PONTO DE ENTRADA PRINCIPAL
// =============================================================

function gerarOSPreventivas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tz = ss.getSpreadsheetTimeZone();

    Logger.log(`🚀 Iniciando geração de OS preventivas v5.11 — fuso: ${tz}`);

    if (CONFIG.VERBOSE) {
      imprimirMapeamentoColunas();
    }

    const { inicio: inicioSemana, fim: limite } = calcularHorizonteSemana(tz);
    Logger.log(`📅 Período gerado: ${formatarData(inicioSemana, tz)} → ${formatarData(limite, tz)}`);

    const plano     = obterAba(ss, CONFIG.ABA_PLANO);
    const abaParams = obterAba(ss, CONFIG.ABA_PARAMS);
    const abaOS     = obterOuCriarAbaOS(ss);

    const capacidadeCargo = lerCapacidadeCargo(abaParams);

    const { chavesOSExistentes, ultimoNumero, ultimaExecucaoPorPlano } =
      lerOSExistentes(abaOS, tz);

    logCapacidades(capacidadeCargo);
    Logger.log(`📋 OS existentes na aba: ${chavesOSExistentes.size} chaves indexadas`);
    Logger.log(`📋 Última execução mapeada: ${ultimaExecucaoPorPlano.size} itens do plano`);
    Logger.log(`📋 Cargos restritos a dias úteis (seg-sex): ${Array.from(CONFIG.APENAS_SEMANA).join(', ') || '(nenhum)'}`);

    const atividades = gerarAtividades(
      plano, inicioSemana, limite, tz, ultimaExecucaoPorPlano
    );
    const ordenadas  = ordenarAtividades(atividades);

    let contadorNumero = ultimoNumero;
    const { novasOS, naoAlocadas } = alocarOS(
      ordenadas,
      chavesOSExistentes,
      capacidadeCargo,
      inicioSemana,
      limite,
      tz,
      () => ++contadorNumero
    );

    gravarOS(abaOS, novasOS);

    logDistribuicaoFinal(naoAlocadas);
    Logger.log(`✅ Concluído! ${novasOS.length} novas OS criadas.`);

  } catch (erro) {
    Logger.log(`❌ ERRO FATAL: ${erro.message}\n${erro.stack || ''}`);
    notificarErroPorEmail(erro);
    throw erro;
  }
}

// =============================================================
// NOTIFICAÇÕES
// =============================================================

function notificarErroPorEmail(erro) {
  if (!CONFIG.EMAIL_NOTIFICACAO_ERRO) return;
  try {
    MailApp.sendEmail({
      to:      CONFIG.EMAIL_NOTIFICACAO_ERRO,
      subject: '❌ Falha na geração de OS preventivas — Martin Brower',
      body:
        `A execução automática de gerarOSPreventivas() falhou.\n\n` +
        `Erro: ${erro.message}\n\n` +
        `Stack:\n${erro.stack || '(indisponível)'}\n\n` +
        `Planilha: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`
    });
  } catch (erroEnvio) {
    Logger.log(`⚠️  Falha ao enviar e-mail de notificação: ${erroEnvio.message}`);
  }
}

function imprimirMapeamentoColunas() {
  Logger.log('📋 MAPEAMENTO DE COLUNAS DO PLANO:');
  Logger.log('   Unidade                → Localidade');
  Logger.log('   Local de Instalação    → LocalMacro');
  Logger.log('   Equipamento/Máquina    → Parte da Descrição');
  Logger.log('   Descrição da Atividade → Parte da Descrição');
  Logger.log('   HH_Estimado            → HH (prioritário)');
  Logger.log('   HH_Equivalente_Tempo   → HH (fallback)');
}

// =============================================================
// TRIGGERS
// =============================================================

function criarTriggerSemanal() {
  deletarTriggers();
  ScriptApp.newTrigger('gerarOSPreventivas')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(7)
    .create();
  Logger.log('✅ Trigger criado: toda sexta às 7h.');
}

function deletarTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('🗑️  Todos os triggers removidos.');
}

// =============================================================
// UTILITÁRIOS DE DATA
// =============================================================

function calcularHorizonteSemana(tz) {
  const hoje      = dataHoje(tz);
  const diaSemana = hoje.getDay();

  const diasAteSegunda = diaSemana === 0 ? 1 : (8 - diaSemana) % 7 || 7;

  const segunda = adicionarDias(hoje, diasAteSegunda);
  const domingo = adicionarDias(segunda, 6);

  return { inicio: segunda, fim: domingo };
}

function dataHoje(tz) {
  return parseDateLocal(Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'));
}

function parseDateLocal(dateStr) {
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
}

function adicionarDias(data, dias) {
  const nova = new Date(data);
  nova.setUTCDate(nova.getUTCDate() + dias);
  return nova;
}

function formatarData(data, tz) {
  return Utilities.formatDate(data, tz, 'yyyy-MM-dd');
}

function diferencaDias(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// =============================================================
// LEITURA DE DADOS
// =============================================================

function lerCapacidadeCargo(aba) {
  const dados = aba.getDataRange().getValues();
  const mapa  = {};

  for (let i = 1; i < dados.length; i++) {
    const cargo = normalizar(dados[i][0]);
    if (!cargo) continue;

    const hhDia    = Number(String(dados[i][1]).replace(',', '.')) || CONFIG.CAP_DIA_PADRAO;
    const hhSemana = Number(String(dados[i][2]).replace(',', '.')) || CONFIG.CAP_SEMANA_PADRAO;

    mapa[cargo] = { dia: hhDia, semana: hhSemana };
  }

  return mapa;
}

function lerOSExistentes(abaOS, tz) {
  const dados                  = abaOS.getDataRange().getValues();
  const chavesOSExistentes     = new Set();
  const ultimaExecucaoPorPlano = new Map();
  let ultimoNumero             = 0;

  for (let i = 1; i < dados.length; i++) {
    const [numeroOS, idPlano, dataProgramada] = dados[i];

    if (idPlano && dataProgramada) {
      const dataStr = resolverData(dataProgramada, tz);
      if (dataStr) {
        chavesOSExistentes.add(`${idPlano}|${dataStr}`);

        const dataOS     = parseDateLocal(dataStr);
        const diaSemOS   = dataOS.getUTCDay();
        const diasAteSeg = diaSemOS === 0 ? -6 : 1 - diaSemOS;
        const segundaOS  = adicionarDias(dataOS, diasAteSeg);
        chavesOSExistentes.add(`${idPlano}|semana-${formatarData(segundaOS, tz)}`);

        const chave = String(idPlano).trim();
        if (!ultimaExecucaoPorPlano.has(chave) || dataOS > ultimaExecucaoPorPlano.get(chave)) {
          ultimaExecucaoPorPlano.set(chave, dataOS);
        }
      }
    }

    if (numeroOS) {
      const match = String(numeroOS).match(/(\d+)$/);
      if (match) ultimoNumero = Math.max(ultimoNumero, Number(match[1]));
    }
  }

  return { chavesOSExistentes, ultimoNumero, ultimaExecucaoPorPlano };
}

function resolverData(valor, tz) {
  if (!valor) return '';

  if (valor instanceof Date) {
    return formatarData(valor, tz);
  }

  if (typeof valor === 'number' && valor > 0) {
    const msDesdeEpoch = (valor - 25569) * 86400 * 1000;
    return formatarData(new Date(msDesdeEpoch), tz);
  }

  if (typeof valor === 'string') {
    const s = valor.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dia, mes, ano] = s.split('/');
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }

  return '';
}

// =============================================================
// GERAÇÃO DE ATIVIDADES
// =============================================================

function validarCabecalhoPlano(idx) {
  const faltando = CONFIG.COLUNAS_OBRIGATORIAS_PLANO.filter(col => idx[col] === undefined);
  if (faltando.length) {
    throw new Error(
      `❌ Colunas obrigatórias ausentes na aba '${CONFIG.ABA_PLANO}': ${faltando.join(', ')}`
    );
  }
}

function gerarAtividades(plano, inicioSemana, limite, tz, ultimaExecucaoPorPlano) {
  const dados   = plano.getDataRange().getValues();
  const headers = dados[0];
  const idx     = {};

  headers.forEach((h, i) => { idx[normalizar(h)] = i; });

  if (CONFIG.VERBOSE) {
    Logger.log('📋 COLUNAS ENCONTRADAS NO PLANO:');
    headers.forEach((h, i) => Logger.log(`   ${i + 1}. "${h}" → "${normalizar(h)}"`));
  }

  validarCabecalhoPlano(idx);

  const temEquipamento   = idx['EQUIPAMENTO/MAQUINA']    !== undefined;
  const temDescAtividade = idx['DESCRICAO DA ATIVIDADE'] !== undefined;

  if (!temEquipamento && !temDescAtividade) {
    Logger.log('⚠️  Nenhuma coluna de descrição encontrada (Equipamento/Máquina ou Descrição da Atividade).');
  }

  const atividades = [];
  const avisos     = [];
  let linhasOk     = 0;
  let descartadasPeriodicidade = 0;
  let avancouAlemLimite = 0;

  for (let i = 1; i < dados.length; i++) {
    const linha    = dados[i];
    const linhaNum = i + 1;

    const item = String(linha[idx['ITEM']] || '').trim();
    if (!item) { avisos.push(`Linha ${linhaNum}: ITEM vazio — ignorada`); continue; }

    const periodicidadeRaw = linha[idx['PERIODICIDADE']];
    const periodicidade    = Number(periodicidadeRaw);
    if (!periodicidade || periodicidade <= 0 || !Number.isFinite(periodicidade)) {
      avisos.push(`Linha ${linhaNum} (${item}): periodicidade inválida "${periodicidadeRaw}" — ignorada`);
      continue;
    }

    const start = linha[idx['START']];
    if (!start || start === '-' || !(start instanceof Date)) {
      avisos.push(`Linha ${linhaNum} (${item}): START inválido "${start}" — ignorada`);
      continue;
    }

    const criticidadeRaw = normalizar(linha[idx['CRITICIDADE']] || '');
    const ordemCrit      = ORDEM_CRITICIDADE[criticidadeRaw];
    if (!ordemCrit) {
      avisos.push(
        `Linha ${linhaNum} (${item}): criticidade desconhecida "${criticidadeRaw}" ` +
        `(valores aceitos: AA, A, C) — ignorada`
      );
      continue;
    }

    const cargo = normalizar(linha[idx['CARGO']] || '');
    if (!cargo) { avisos.push(`Linha ${linhaNum} (${item}): CARGO vazio — ignorada`); continue; }

    const tag = String(linha[idx['TAG']] || '').trim();
    if (!tag) { avisos.push(`Linha ${linhaNum} (${item}): TAG vazio — ignorada`); continue; }

    const equipamento   = String(linha[idx['EQUIPAMENTO/MAQUINA']]    || '').trim();
    const descAtividade = String(linha[idx['DESCRICAO DA ATIVIDADE']] || '').trim();

    let descricao;
    if (equipamento && descAtividade) {
      descricao = `${equipamento} - ${descAtividade}`;
    } else if (equipamento) {
      descricao = equipamento;
    } else if (descAtividade) {
      descricao = descAtividade;
    } else {
      descricao = 'Sem descrição';
      avisos.push(`Linha ${linhaNum} (${item}): Equipamento/Máquina e Descrição da Atividade vazios`);
    }

    const localMacro = String(
      linha[idx['LOCAL DE INSTALACAO']] || linha[idx['LOCALMACRO']] || ''
    ).trim();
    const localidade = String(
      linha[idx['UNIDADE']] || linha[idx['LOCALIDADE']] || ''
    ).trim();
    const sistema = String(linha[idx['SISTEMA']] || '').trim();
    const tipo    = String(linha[idx['TIPO']]    || '').trim();

    let hh = Number(linha[idx['HH_ESTIMADO']] || 0);
    if (!hh || hh <= 0) hh = Number(linha[idx['HH_EQUIVALENTE_TEMPO']] || 0);
    if (!hh || hh <= 0) hh = CONFIG.HH_FALLBACK;

    const atividade = {
      id:               item,
      tag,
      descricao,
      localMacro,
      localidade,
      sistema,
      tipo,
      criticidade:      ordemCrit,
      criticidadeLabel: criticidadeRaw,
      cargo,
      hh,
      periodicidade,
    };

    linhasOk++;

    let data = parseDateLocal(formatarData(start, tz));
    let avancou = false;
    while (data < inicioSemana) {
      data = adicionarDias(data, periodicidade);
      avancou = true;
    }

    const ultimaOS = ultimaExecucaoPorPlano.get(item);

    let ocorrencias = 0;
    if (data > limite) {
      avancouAlemLimite++;
      if (CONFIG.VERBOSE) {
        Logger.log(`⏭️  ${item}: data ${formatarData(data, tz)} após limite ${formatarData(limite, tz)} (período ${periodicidade}d)`);
      }
    } else {
      while (data <= limite) {
        if (ultimaOS) {
          const diasDesdeUltima = diferencaDias(ultimaOS, data);
          const intervaloMinimo = periodicidade - CONFIG.TOLERANCIA_DIAS_PERIODICIDADE;

          if (diasDesdeUltima < intervaloMinimo) {
            if (CONFIG.VERBOSE) {
              Logger.log(
                `⏭️  ${item}: ocorrência em ${formatarData(data, tz)} descartada ` +
                `— última OS em ${formatarData(ultimaOS, tz)} ` +
                `(${diasDesdeUltima}d < mínimo ${intervaloMinimo}d)`
              );
            }
            descartadasPeriodicidade++;
            data = adicionarDias(data, periodicidade);
            continue;
          }
        }

        atividades.push({ ...atividade, data: new Date(data) });
        ocorrencias++;
        data = adicionarDias(data, periodicidade);
      }
    }

    if (CONFIG.VERBOSE) {
      Logger.log(`📝 ${item} | ${tag} | ${hh}h | ${ocorrencias} ocorrência(s)`);
    }
  }

  if (avisos.length) {
    Logger.log(`⚠️  AVISOS (${avisos.length}):\n   ` + avisos.join('\n   '));
  }

  if (descartadasPeriodicidade > 0) {
    Logger.log(`🔁 ${descartadasPeriodicidade} ocorrência(s) descartada(s) por periodicidade`);
  }

  if (avancouAlemLimite > 0) {
    Logger.log(`⏭️  ${avancouAlemLimite} item(ns) avançaram além do limite da semana (período maior que a janela restante)`);
  }

  Logger.log(`📊 Plano: ${linhasOk} linhas válidas → ${atividades.length} atividades para a semana`);
  return atividades;
}

// =============================================================
// ORDENAÇÃO
// =============================================================

function ordenarAtividades(atividades) {
  return [...atividades].sort((a, b) =>
    a.criticidade !== b.criticidade
      ? a.criticidade - b.criticidade
      : a.data - b.data
  );
}

// =============================================================
// ALOCAÇÃO DE OS
// =============================================================

function alocarOS(atividades, chavesOSExistentes, capacidadeCargo, inicioSemana, limite, tz, proximoNumero) {
  const cargaDia    = {};
  const cargaSemana = {};
  const novasOS     = [];
  const naoAlocadas = [];

  const chaveSemanaBase = formatarData(inicioSemana, tz);

  for (const atividade of atividades) {
    const chaveSemana = `${atividade.id}|semana-${chaveSemanaBase}`;

    if (chavesOSExistentes.has(chaveSemana)) continue;

    const cap = capacidadeCargo[atividade.cargo] || {
      dia:    CONFIG.CAP_DIA_PADRAO,
      semana: CONFIG.CAP_SEMANA_PADRAO,
    };

    if (!cargaSemana[atividade.cargo]) cargaSemana[atividade.cargo] = 0;

    if (cargaSemana[atividade.cargo] + atividade.hh > cap.semana) {
      naoAlocadas.push({
        tag:    atividade.tag,
        cargo:  atividade.cargo,
        hh:     atividade.hh,
        motivo: `capacidade semanal esgotada (${cargaSemana[atividade.cargo].toFixed(1)}h / ${cap.semana}h)`
      });
      continue;
    }

    const dataProgramada = encontrarMelhorDia(atividade, cargaDia, cap, inicioSemana, limite, tz);

    if (!dataProgramada) {
      naoAlocadas.push({
        tag:    atividade.tag,
        cargo:  atividade.cargo,
        hh:     atividade.hh,
        motivo: 'sem dia disponível na semana'
      });
      continue;
    }

    const chaveData  = formatarData(dataProgramada, tz);
    const chaveCarga = `${chaveData}|${atividade.cargo}`;

    cargaDia[chaveCarga]          = (cargaDia[chaveCarga] || 0) + atividade.hh;
    cargaSemana[atividade.cargo] += atividade.hh;

    const numero   = proximoNumero();
    const numeroOS = `PM-${chaveData.replace(/-/g, '')}-${String(numero).padStart(5, '0')}`;

    novasOS.push([
      numeroOS,
      atividade.id,
      dataProgramada,
      '',
      atividade.tag,
      atividade.descricao,
      atividade.localMacro,
      atividade.localidade,
      atividade.sistema,
      atividade.tipo,
      atividade.criticidadeLabel,
      atividade.cargo,
      atividade.hh,
      'Programada',
      new Date(),
      '', '', '',
      'Nao',
      '', '', '', '', '', '', 'Programada'
    ]);

    chavesOSExistentes.add(chaveSemana);

    if (CONFIG.VERBOSE) {
      Logger.log(`✅ OS criada: ${numeroOS} | ${atividade.tag} | ${chaveData} | ${atividade.hh}h`);
    }
  }

  logDistribuicao(cargaDia, cargaSemana, capacidadeCargo);
  return { novasOS, naoAlocadas };
}

// =============================================================
// ENCONTRAR MELHOR DIA
// =============================================================

function encontrarMelhorDia(atividade, cargaDia, cap, inicioSemana, limite, tz) {
  const diasElegiveis = [];
  let cursor = new Date(inicioSemana);

  while (cursor <= limite) {
    if (diaPermitido(cursor, atividade.cargo, tz)) {
      const chaveData  = formatarData(cursor, tz);
      const chaveCarga = `${chaveData}|${atividade.cargo}`;
      const alocado    = cargaDia[chaveCarga] || 0;

      if (alocado + atividade.hh <= cap.dia) {
        diasElegiveis.push({
          data:        new Date(cursor),
          ocupacaoPct: cap.dia > 0 ? alocado / cap.dia : 1
        });
      }
    }
    cursor = adicionarDias(cursor, 1);
  }

  if (!diasElegiveis.length) return null;

  diasElegiveis.sort((a, b) => a.ocupacaoPct - b.ocupacaoPct);
  return diasElegiveis[0].data;
}

function diaPermitido(data, cargo, tz) {
  const dia = parseInt(Utilities.formatDate(data, tz, 'u'), 10);
  return CONFIG.APENAS_SEMANA.has(cargo) ? (dia >= 1 && dia <= 5) : true;
}

// =============================================================
// LOGS
// =============================================================

function logCapacidades(capacidadeCargo) {
  Logger.log('📊 Capacidades por cargo:');
  Object.entries(capacidadeCargo).forEach(([cargo, cap]) => {
    Logger.log(`   ${cargo.padEnd(25)}: ${cap.dia}h/dia | ${cap.semana}h/semana`);
  });
}

function logDistribuicao(cargaDia, cargaSemana, capacidadeCargo) {
  Logger.log('\n📊 DISTRIBUIÇÃO POR DIA:');
  Object.keys(cargaDia).sort().forEach(chave => {
    const [data, cargo] = chave.split('|');
    const alocado = cargaDia[chave];
    const cap     = capacidadeCargo[cargo] || { dia: CONFIG.CAP_DIA_PADRAO };
    const pct     = (alocado / cap.dia) * 100;
    const alerta  = pct > 90 ? ' ⚠️' : '';
    Logger.log(`   ${data} | ${cargo.padEnd(25)} | ${alocado.toFixed(1)}h / ${cap.dia}h (${pct.toFixed(0)}%)${alerta}`);
  });

  Logger.log('\n📊 TOTAL SEMANAL:');
  Object.entries(cargaSemana).forEach(([cargo, alocado]) => {
    const cap    = capacidadeCargo[cargo] || { semana: CONFIG.CAP_SEMANA_PADRAO };
    const pct    = (alocado / cap.semana) * 100;
    const status = pct > 100 ? '🔴 EXCEDIDO' : pct > 90 ? '🟡' : '🟢';
    Logger.log(`   ${cargo.padEnd(25)}: ${alocado.toFixed(1)}h / ${cap.semana}h (${pct.toFixed(0)}%) ${status}`);
  });

  Logger.log('');
}

function logDistribuicaoFinal(naoAlocadas) {
  if (!naoAlocadas.length) return;

  Logger.log(`\n⚠️  NÃO ALOCADAS (${naoAlocadas.length}):`);
  naoAlocadas.forEach(({ tag, cargo, hh, motivo }) => {
    Logger.log(`   TAG ${tag} | ${cargo} | ${hh}h → ${motivo}`);
  });
  Logger.log('');
}

// =============================================================
// GRAVAÇÃO
// =============================================================

function gravarOS(abaOS, novasOS) {
  if (!novasOS.length) {
    Logger.log('ℹ️  Nenhuma nova OS para gravar.');
    return;
  }

  if (abaOS.getLastColumn() > 0) validarCabecalhoOS(abaOS);
  garantirEstruturaOS(abaOS, COLUNAS_OS);

  const ultimaLinha = abaOS.getLastRow();
  abaOS
    .getRange(ultimaLinha + 1, 1, novasOS.length, novasOS[0].length)
    .setValues(novasOS);
}

function garantirEstruturaOS(sheet, colunas) {
  const ultimaColuna = sheet.getLastColumn();

  if (ultimaColuna === 0) {
    sheet.getRange(1, 1, 1, colunas.length).setValues([colunas]);
    return;
  }

  const cabecalhoAtual   = sheet.getRange(1, 1, 1, ultimaColuna).getValues()[0];
  const colunasFaltantes = colunas.filter(c => !cabecalhoAtual.includes(c));

  if (colunasFaltantes.length) {
    sheet
      .getRange(1, ultimaColuna + 1, 1, colunasFaltantes.length)
      .setValues([colunasFaltantes]);
  }
}

function validarCabecalhoOS(sheet) {
  const cabecalho    = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const ordemCorreta = COLUNAS_OS.every((col, i) => cabecalho[i] === col);

  if (!ordemCorreta) {
    throw new Error(
      '❌ Colunas da aba PROGRAMAÇÃO fora de ordem. ' +
      'Restaure a ordem original antes de executar.'
    );
  }
}

// =============================================================
// UTILITÁRIOS
// =============================================================

function obterAba(ss, nome) {
  const aba = ss.getSheetByName(nome);
  if (!aba) throw new Error(`❌ Aba '${nome}' não encontrada`);
  return aba;
}

function obterOuCriarAbaOS(ss) {
  let abaOS = ss.getSheetByName(CONFIG.ABA_OS);
  if (!abaOS) {
    abaOS = ss.insertSheet(CONFIG.ABA_OS);
    abaOS.getRange(1, 1, 1, COLUNAS_OS.length).setValues([COLUNAS_OS]);
  }
  return abaOS;
}
