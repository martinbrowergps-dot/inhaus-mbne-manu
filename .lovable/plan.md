## Objetivo

Evoluir três áreas do Centro de Controle:
1. **Temperaturas** — adicionar gráficos de tendência por local com seletor de período.
2. **Programação** — visualizar lado a lado o que está Programado vs o que foi Executado, suportando o novo conjunto de status.
3. **Indicadores** — adicionar KPI de Aderência à Programação como destaque, e oferecer um conjunto enxuto de gráficos executivos extras.

---

## 1. Temperaturas — gráficos de tendência

### Novo componente `<TempTrendChart/>`
- Recharts `LineChart` por local, com faixa-alvo (`ReferenceArea` verde) e limites min/max (`ReferenceLine` tracejada).
- Eixo X: timestamp formatado (HH:mm para 24h, dd/MM para 7d, dd/MM para 30d).
- Linha principal = temperatura mais recente disponível por leitura (`latestTemp`).
- Cor da linha = cor do status atual do local (verde / amarelo / vermelho).
- Tooltip mostra: horário completo, temperatura, técnico, status pontual.

### Seletor de período (24h / 7d / 30d)
- Estado controlado por search param `?range=24h|7d|30d` (default `24h`) usando `validateSearch` na rota `_app.temperaturas.tsx`.
- `<Tabs>` no topo da página alterna o período; afeta todos os gráficos da página.
- Filtragem feita no cliente sobre `data.medicoes` usando `getRowTimestamp`.

### Layout da página Temperaturas (revisão)
1. **Header** com título + Tabs do período.
2. **Cards de status** (atual TempCard) agrupados como hoje: Críticos → Alerta → Normais.
3. **Nova seção "Tendência por Local"** — grid de gráficos (1 col mobile, 2 col desktop). Um `<TempTrendChart/>` por local.
4. **Nova seção "Visão Comparativa"** — um único `LineChart` multi-linha (uma linha por local), útil para identificar locais que estão divergindo juntos. Toggle de legenda para mostrar/ocultar locais.
5. **Mini-KPIs** acima dos gráficos: nº de leituras no período, % do tempo dentro da faixa, nº de eventos críticos no período, maior desvio absoluto.

### Tratamento de dados
- Função utilitária em `src/lib/temperature.ts`:
  - `filterByRange(medicoes, range)` — filtra por janela (now − 24h / 7d / 30d).
  - `buildSeries(medicoes, local)` — ordena por timestamp e converte para `{ t, temp, status, tecnico }`.
  - `computeRangeKpis(series, faixa)` — % dentro da faixa, contagem de críticos, desvio máximo.
- Sem registros no período → estado vazio "Sem leituras nesta janela".

---

## 2. Programação — Programado vs Executado lado a lado

### Novos status suportados
Suporte explícito a: **Programada, Em execução, Pausada, Finalizada, Cancelada, Atrasada, Reprogramada**.

- `Atrasada` é derivada: `Status === "Programada"` e `DataProgramada < hoje`. (Computada no cliente, não precisa existir na planilha.)
- `Reprogramada` é derivada: campo `DataReprogramada` preenchido.
- `src/lib/status.ts` novo: `deriveExecStatus(row): ExecStatus` retornando o status efetivo + cor/badge config centralizada (reutilizada em todas as telas).

### Layout split (Programado | Executado)
- Página `_app.programacao.tsx` ganha duas colunas (`grid-cols-1 lg:grid-cols-2`):
  - **Coluna esquerda — "Programado"**: OS com status `Programada`, `Em execução`, `Pausada`, `Atrasada`, `Reprogramada`.
  - **Coluna direita — "Executado"**: OS com status `Finalizada` e `Cancelada` (com filtro de período: hoje / 7d / 30d).
- Cada coluna usa o `DataTable` atual com colunas reduzidas (Nº OS, Data, Sistema, Descrição, Crit., Status).
- Header com:
  - Contadores no topo de cada coluna (ex.: "Programado: 24 OS · 96 HH" / "Executado: 18 OS · 72 HH").
  - Busca única que filtra ambas as colunas simultaneamente.
- Badges de status padronizados (cores em `status.ts`):
  - Programada → primary, Em execução → warning, Pausada → muted, Finalizada → success, Cancelada → destructive, Atrasada → destructive (pulse), Reprogramada → secondary.

### Toggle de visualização
Tabs no topo da página: **"Comparativo"** (default, split acima) e **"Tabela completa"** (a tabela única atual, preservada para uso operacional).

---

## 3. KPI prioritário: Aderência à Programação

### Novo componente `<AderenciaCard/>`
- Gauge semicircular (Recharts `RadialBarChart`) com %.
- Fórmula: `finalizadas_no_prazo / total_programadas_no_periodo * 100`.
  - `finalizadas_no_prazo`: `Status === "Finalizada"` e (sem `DataReprogramada` OU `DataReprogramada <= DataProgramada`).
  - `total_programadas`: todas as OS com `DataProgramada` na janela.
- Faixas de cor: ≥95% success · 85–94% warning · <85% destructive.
- Mini-tendência ao lado: sparkline (Recharts) com aderência das últimas 4 semanas.

### Onde aparece
- **Dashboard (`_app.index.tsx`)**: novo card grande de aderência no topo, ao lado dos KPIs existentes.
- **Indicadores (`_app.indicadores.tsx`)**: seção dedicada com:
  - Gauge atual.
  - `BarChart` de aderência por sistema.
  - `LineChart` de aderência semanal (últimas 8 semanas).
  - `BarChart` empilhado de OS por status (Programada vs Executada vs Atrasada) por dia.

---

## 4. Sugestões adicionais (priorizadas, mas não obrigatórias)

Listadas em ordem de impacto. Posso entregar todas nesta rodada se aprovado, ou apenas as marcadas:

1. **Backlog por criticidade** — barras AA / A / B mostrando OS atrasadas + HH acumulado. Alta criticidade entra como alerta automático.
2. **Heatmap diário de checklist e passagem de turno** — calendário 30 dias com células coloridas (verde = cumprido, vermelho = faltou). Detecta lacunas operacionais.
3. **HH realizado vs programado por cargo** — barras comparativas semanais (já temos só programado).
4. **Taxa de reprogramação** — % de OS com `DataReprogramada ≠ vazio` na semana, tendência 8 semanas.
5. **Tempo médio em "Em execução"** — média de horas entre início e finalização das OS finalizadas no período (precisa de timestamp de execução; se a planilha não tiver, vira backlog futuro).

---

## Detalhes técnicos

### Arquivos novos
- `src/lib/status.ts` — `ExecStatus` enum, `deriveExecStatus`, `statusConfig` (label, cor, classes Tailwind).
- `src/lib/temperature.ts` — adicionar `filterByRange`, `buildSeries`, `computeRangeKpis`.
- `src/components/temp-trend-chart.tsx` — gráfico por local.
- `src/components/temp-multi-chart.tsx` — gráfico comparativo multi-linha.
- `src/components/aderencia-card.tsx` — gauge + sparkline.
- `src/components/status-badge.tsx` — badge único reutilizado em todas as tabelas.

### Arquivos editados
- `src/routes/_app.temperaturas.tsx` — `validateSearch` (`range`), Tabs, novas seções.
- `src/routes/_app.programacao.tsx` — Tabs Comparativo/Tabela, layout split, busca compartilhada.
- `src/routes/_app.index.tsx` — adicionar `AderenciaCard` no topo.
- `src/routes/_app.indicadores.tsx` — nova seção de aderência (gauge, por sistema, semanal, empilhado por status).
- `src/routes/_app.alertas.tsx` — incluir status "Atrasada" como alerta automático.
- `src/lib/sheets-types.ts` — adicionar tipo `ExecStatus` exportado de `status.ts`.

### Convenções mantidas
- Recharts (já no projeto) — sem novas dependências.
- TanStack Query com `sheetsQueryOptions` já compartilhado.
- Glassmorphism, tokens semânticos de cor em `src/styles.css`, sem cores hardcoded.
- Search params para estado de UI (período de temperatura, aba da programação) para manter URLs compartilháveis.

### Validações
- Build após cada bloco (Temperaturas → Programação → Indicadores).
- Verificar render no preview mobile (430px) e desktop.
- Confirmar que estados vazios e sem leituras não quebram os gráficos.

---

## Pergunta em aberto (posso assumir defaults se preferir)

- **Status finais**: adoto **Programada, Em execução, Pausada, Finalizada, Cancelada, Atrasada (derivada), Reprogramada (derivada)**. Avise se quiser remover/renomear algum.
- **Sugestões adicionais (seção 4)**: vou implementar **Backlog por criticidade** e **Heatmap de checklist/passagem** junto, por serem alto impacto e já baseados em dados existentes. Os itens 3–5 ficam para a próxima rodada salvo indicação contrária.
