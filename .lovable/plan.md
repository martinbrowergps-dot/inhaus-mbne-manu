## Exportação de Dados

### Objetivo
Adicionar botão "Exportar" em todas as telas do Centro de Controle, gerando arquivos client-side sem necessidade de backend.

---

### 1. Exportar CSV (todas as telas)

**Telas:**
- Programação — exporta OS filtradas (comparativo ou tabela completa)
- Backlog — exporta solicitações filtradas
- Temperaturas — exporta medições do período selecionado
- Passagem de Turno — exporta registros
- Checklists — exporta docas / geral / portas
- Equipe — exporta técnicos
- Alertas — exporta alertas ativos

**Formato:**
- Separação por ponto-e-vírgula (compatível com Excel BR)
- Encoding UTF-8 com BOM
- Nome do arquivo: `programacao_2025-06-21.csv`

**Implementação:**
- Componente reutilizável `<ExportCsvButton>`
- Geração via `Blob` + `URL.createObjectURL` no browser
- Sem dependências externas

---

### 2. Exportar PDF (Visão Geral e Indicadores)

**Escopo:**
- Visão Geral — PDF com todos os KPIs e gráficos em layout A4 paisagem
- Indicadores — PDF com gráficos de aderência e heatmap

**Implementação:**
- Biblioteca `html2canvas` + `jspdf` para capturar os painéis e gerar PDF
- Ou biblioteca `pdf-lib` para montar PDF programaticamente se o html2canvas não renderizar bem no tema escuro

---

### 3. Layout do botão

- Posicionado no header de cada página, ao lado do título
- Ícone `Download` do Lucide
- Dropdown com opções: "Exportar CSV" (sempre) + "Exportar PDF" (onde aplicável)

---

## Técnico

### Novos arquivos
- `src/components/export-button.tsx` — componente de exportação CSV
- `src/lib/export-csv.ts` — função utilitária de geração de CSV
- `src/lib/export-pdf.ts` — função utilitária de geração de PDF (Visão Geral / Indicadores)

### Arquivos editados
- `src/routes/_app.index.tsx` — botão Exportar CSV + PDF
- `src/routes/_app.programacao.tsx` — botão Exportar CSV
- `src/routes/_app.backlog.tsx` — botão Exportar CSV
- `src/routes/_app.temperaturas.tsx` — botão Exportar CSV
- `src/routes/_app.indicadores.tsx` — botão Exportar CSV + PDF
- `src/routes/_app.alertas.tsx` — botão Exportar CSV
- `src/routes/_app.checklists.tsx` — botão Exportar CSV
- `src/routes/_app.passagem-turno.tsx` — botão Exportar CSV
- `src/routes/_app.equipe.tsx` — botão Exportar CSV
- `src/routes/_app.hh-semanal.tsx` — botão Exportar CSV

### Dependências
- `html2canvas` e `jspdf` (para PDF) — adicionar via bun
- Sem backend necessário, tudo client-side
