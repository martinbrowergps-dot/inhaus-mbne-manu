# Direção de UI/UX para o Centro de Controle de Manutenção

## Escolhas do usuário (travadas)
- **Paleta**: Deep Ocean (`#082F49`, `#0C4A6E`, `#06B6D4`, `#10B981`)
- **Tipografia**: Tech Mono + Sans (JetBrains Mono para números/IDs + Work Sans para textos)
- **Layout**: Dashboard denso (sidebar + grid de cards e tabelas)

## Direção criativa: "Deep Ocean Command"
Um painel de controle de manutenção industrial que parece uma sala de comando submarina/offshore: fundo muito profundo, superfícies em camadas de azul-petróleo, acentos em ciano e verde de status. A sensação é **técnica, confiável e imersiva** — não brinca com cores, usa luz para indicar estado.

### Decisões visuais concretas
- **Fundo**: `#082F49` com gradiente radial suave vindo do topo (`#0C4A6E` → `#082F49` → `#042033`).
- **Superfícies de cards/painéis** em 3 níveis:
  - **Nível 1 (base)**: `#0C4A6E` com borda sutil `#06B6D4/15`.
  - **Nível 2 (hover/focus)**: `#0E5A82` com elevação leve.
  - **Nível 3 (destaque/KPI crítico)**: `#0A3A55` com glow ciano ou vermelho conforme semântica.
- **Acentos semânticos**:
  - Primário: `#06B6D4` (ciano)
  - Sucesso: `#10B981` (verde oceano)
  - Alerta: `#F59E0B` (âmbar)
  - Perigo: `#EF4444` (vermelho)
- **Tipografia**:
  - Títulos/seções: Work Sans semibold, tracking levemente negativo.
  - Números, IDs, datas, HH, porcentagens: JetBrains Mono tabular.
  - Labels/caps: Work Sans bold, 9–10px, tracking 0.15em, uppercase.
- **Formas**: bordas arredondadas consistentes (`radius: 12px` para cards, `8px` para botões/chips, `16px` para modais).
- **Elevação**: sombras azuladas em vez de pretas puras (`0 8px 32px rgba(6,182,212,0.08)`), criando profundidade sem sair da paleta.
- **Estados de interação**:
  - Hover: leve elevação + brilho de borda ciano.
  - Focus: anel ciano sólido com offset.
  - Crítico: pulse vermelho sutil (mantém o neon, mas mais contido).
- **Densidade**: mantém dashboard denso. Cards com padding 16–20px, gaps 16px, tabelas compactas com altura de linha 40px.

## O que muda no código

### 1. Tokens globais (`src/styles.css`)
Substituir o tema Martin Brower atual pelos tokens Deep Ocean, mantendo a estrutura de variáveis shadcn:
```
--background: #082F49
--foreground: #E0F7FF
--card: #0C4A6E
--card-foreground: #FFFFFF
--popover: #0C4A6E
--primary: #06B6D4
--primary-foreground: #042033
--secondary: #0E5A82
--muted: #0A3A55
--muted-foreground: #93C5D8
--accent: #115E83
--destructive: #EF4444
--success: #10B981
--warning: #F59E0B
--border: rgba(6, 182, 212, 0.12)
--input: #0A3A55
--ring: #06B6D4
--chart-1: #06B6D4
--chart-2: #10B981
--chart-3: #F59E0B
--chart-4: #EF4444
--chart-5: #A855F7
--sidebar: #042033
--sidebar-foreground: #B8D9E8
--sidebar-primary: #06B6D4
--sidebar-accent: #0A3A55
```
Atualizar gradientes, sombras e neon utilities para a nova paleta.

### 2. Componentes base shadcn
Ajustar `button`, `card`, `badge`, `dialog`, `input`, `select`, `tabs`, `sidebar` para usarem os novos tokens. Não reescrever do zero — apenas trocar cores/raios/sombras para manter compatibilidade.

### 3. Componentes próprios
- `Panel`: substituir `.panel`/`.panel-glass` por superfície nível 1 com borda ciano sutil e hover nível 2.
- `KpiBox`/`KpiCarousel`: cards menores com números em JetBrains Mono e labels em caps.
- `StatusBadge`: manter forma, atualizar cores para novo semântico.
- `AppSidebar`: sidebar em `#042033`, item ativo com barra ciano à esquerda e fundo `#0A3A55`.
- `TopHeader`: fundo glass com blur e borda ciano sutil.
- `ExportButton`: botão primário ciano, dropdown com ícones coloridos.

### 4. Gráficos (Recharts)
Atualizar cores dos eixos, grid e tooltips para `#93C5D8` e `#06B6D4`. Garantir contraste contra fundo `#082F49`.

### 5. PDFs
Atualizar `COLOR_OVERRIDES` em `pdf-css-patch.ts` para os hex Deep Ocean, para que exportações visuais não fiquem com cores quebradas.

### 6. Tipografia
- Adicionar `@fontsource/jetbrains-mono` e `@fontsource/work-sans` (se ainda não estiverem).
- Importar no entrypoint da aplicação.
- Atualizar `--font-mono` e adicionar `--font-sans` no `@theme inline`.

## Escopo de implementação sugerido
**Passada única** (recomendado): tokens + componentes base + componentes próprios + gráficos + PDFs. Tudo muda junto para consistência visual.

## Riscos e mitigações
- **Contraste em superfícies**: validar `#93C5D8` sobre `#0C4A6E` (ratio ~4.8:1, OK).
- **PDF visual**: retestar página 2 após mudança de cores para garantir que não haja fundo escuro residual.
- **Carga de fontes**: usar fontsource para evitar FOUT e garantir funcionamento offline/PDF.

## Próximos passos
1. Aprovar direção Deep Ocean Command.
2. Implementar tokens globais.
3. Re-skin componentes próprios e shadcn.
4. Ajustar gráficos e PDF overrides.
5. Validar via build + screenshots desktop/mobile + exportação PDF visual.
