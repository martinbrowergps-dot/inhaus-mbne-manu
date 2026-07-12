# Auditoria — Gráficos vs. padrão Power BI

Comparei os gráficos atuais (Recharts) com o que se espera de um dashboard estilo Power BI. Abaixo, o que já está OK e o que falta para bater o padrão.

## Já está no padrão

- Paleta consistente Deep Ocean (ciano/verde/âmbar/vermelho) por semântica de status.
- Grid discreto (`rgba(255,255,255,0.06)`) e eixos em ciano suave (`#93C5D8`).
- Tooltip customizado (`CHART_TOOLTIP_STYLE`) com fundo escuro e borda ciano.
- Cantos arredondados nas barras, donut com `paddingAngle`, radial de aderência.
- Aderência com breakdown numérico + meta.

## O que falta para virar "Power BI-like"

### 1. Data labels sempre visíveis
- Power BI mostra o valor em cima de cada barra/fatia por padrão. Hoje:
  - `HhComparisonChart` (barras planejado/executado) — sem `LabelList`.
  - `chart-donut` — sem rótulo nas fatias.
  - `chart-pie` — mostra só o número cru, sem `%` nem nome.
  - `chart-bar-horizontal` — OK, já tem `LabelList`.
  - Gráficos de dia/status na Visão Geral e Relatórios — sem rótulos.

### 2. Formatação BR nos eixos e tooltips
- Eixos Y numéricos mostram `1000` em vez de `1.000`. Aplicar `formatBRNumber` no `tickFormatter`.
- HH deve exibir sufixo `h`; percentuais `%`; datas no formato `dd/mm`.
- Tooltip deve reformatar valor + nome amigável (hoje vários gráficos usam a chave crua tipo `planejado`).

### 3. Legenda e títulos consistentes
- Legenda no topo (Power BI padrão), com bullets quadrados coloridos e capitalização correta.
- Título do gráfico + subtítulo + unidade (ex.: "HH por dia · horas") padronizados via `Panel`.
- Remover legendas redundantes quando há só 1 série.

### 4. Interatividade
- `activeDot` e `cursor` destacando a categoria/hover (linhas de temperatura já têm; barras não).
- Cursor customizado nas barras (`cursor={{ fill: 'rgba(6,182,212,0.08)' }}`).
- Ordenação consistente (donut/pie sempre desc por valor; barras horizontais idem).

### 5. Empty state e loading
- `Empty` existe em Visão Geral, mas outros gráficos (HH, temperatura multi) mostram texto solto. Padronizar componente único.
- Skeleton nos gráficos durante o `loading` (hoje só KPIs têm).

### 6. Escalas e eixos
- Barras com `domain={[0, 'dataMax + padding']}` para não colar no topo.
- Eixo Y do multi-temperatura fica melhor com `allowDecimals={false}` quando a série é inteira.
- Rotacionar `XAxis` labels quando há >10 categorias (`angle={-30}`, `textAnchor="end"`).

### 7. Cores por status (semântica global)
- Hoje cada gráfico define seu array de cores local (`HH_COLORS`, `PALETTE`, `COLORS`). Centralizar em `chart-utils.ts`:
  - `STATUS_COLORS.planejado / naoPlanejado / finalizada / cancelada / pendente`
  - `SERIES_COLORS.planejado / executado`
  - Garantir que a mesma categoria tem sempre a mesma cor em todo o app.

### 8. Detalhes visuais Power BI
- Borda inferior de 2px na cor da série sob KPIs (accent line) — já parcial em `KpiCard`.
- Sombra sutil no tooltip.
- Fonte mono (`JetBrains Mono`) nos números dos rótulos e eixos (já ativa em KPIs, faltam gráficos).

## Escopo se você aprovar a padronização

Se topar, o próximo passo é uma passada única aplicando:
1. `STATUS_COLORS` + `SERIES_COLORS` centralizados.
2. `LabelList` + `tickFormatter` BR em todos os gráficos de barras/pizza.
3. Tooltip e legenda padronizados via helpers em `chart-utils.ts`.
4. Fonte mono nos rótulos, cursor destacado, empty/skeleton unificado.

Arquivos que seriam tocados: `src/lib/chart-utils.ts`, `src/components/visao-geral/chart-*.tsx`, `src/components/programacao/hh-comparison-chart.tsx`, `src/components/temp-multi-chart.tsx`, `src/components/temp-trend-chart.tsx`, `src/components/aderencia-card.tsx`, e os gráficos inline em `_app.index.tsx` e `_app.relatorios.tsx`.

Quer que eu prossiga com essa padronização?