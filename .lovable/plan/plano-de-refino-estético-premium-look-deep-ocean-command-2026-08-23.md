# Plano de Refino Estético "Premium Look" - Deep Ocean Command

Este plano visa elevar a interface atual para um nível de excelência visual (Awwwards/Apple style), focando em sofisticação, minimalismo moderno e fluidez, mantendo a identidade "Deep Ocean".

## 1. Identidade Visual e Profundidade (Glassmorphism & Shadows)
- **Cores:** Refinar a paleta `oklch` no `src/styles.css` para maior profundidade e contraste dinâmico.
- **Glassmorphism:** Aprimorar a classe `.glass` com um mix de `backdrop-filter`, `saturate` e bordas semi-transparentes sutis.
- **Sombras:** Implementar um sistema de sombras em camadas (Layered Shadows) para criar volume sem "sujeira" visual.

## 2. Tipografia e Ritmo (Typography Engine)
- **Hierarquia:** Ajustar `PageHeader` e `SectionHeader` para usar escalas fluidas e pesos contrastantes (Bold Display vs. Mono Tech).
- **JetBrains Mono:** Uso estratégico para dados técnicos, IDs e métricas, reforçando o aspecto de "instrumentação industrial".

## 3. Motion Design e Micro-interações
- **Entradas Staggered:** Implementar animações de entrada escalonadas nos cards da `Visão Geral` e tabelas usando `framer-motion` (ou utilitários CSS customizados).
- **Hover Effects:** Refinar a classe `.panel` com transições `cubic-bezier` e brilhos (glow) perimetrais sutis.

## 4. Layout Moderno (Bento Grid & Spacing)
- **Grid de 8px:** Revisar paddings e gaps em todos os componentes base (`Panel`, `PageHeader`, `DataTable`).
- **Bento Grid:** Ajustar o layout da `Visão Geral` para uma estrutura de grade bento mais equilibrada, utilizando o espaço negativo para reduzir a carga cognitiva.

## Detalhes Técnicos
- **CSS:** Uso intensivo de utilitários Tailwind v4 e variáveis CSS nativas.
- **Performance:** As animações serão baseadas em transformações de GPU para garantir fluidez.
- **Refatoração:** Limpeza de estilos redundantes e unificação dos tokens de design em `src/styles.css`.

---
**Implementado / Corrigido / Testado / Pendências / Status (🟢)**
