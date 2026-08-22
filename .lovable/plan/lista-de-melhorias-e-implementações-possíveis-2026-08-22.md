# Lista de melhorias e implementações possíveis

Levantamento do estado atual do Centro de Controle (dados verificados: 14 telas em `src/routes`, tabelas `profiles`, `user_roles`, `sheets_snapshot`, `sync_log`, e apenas 1 usuário cadastrado hoje com papel `visualizador`).

## P0 — Corrigir agora (impacto direto de uso)

1. **Gestão de papéis (admin/gestor/visualizador)**
   O enum de papéis e a função de verificação existem, mas o app nunca lê o papel do usuário e não há tela para conceder papéis. Hoje o único usuário é `visualizador`, então, com a nova regra de acesso, ele não enxerga o histórico completo de sincronizações.
   - Hook `useRole()` lendo o papel do usuário logado.
   - Tela de administração de usuários (listar, promover a gestor/admin) visível só para admin.
   - Promover o usuário atual a admin na mesma entrega.

2. **Menu e ações sensíveis por papel**
   Esconder "Saúde do ETL" e o botão "Sincronizar agora" de quem é apenas visualizador, em vez de mostrar tela vazia.

## P1 — Confiabilidade dos dados

3. **Alerta de ETL parado**: banner no topo quando a última sincronização automática passou de 30 min, com link para a tela de ETL.
4. **Indicador de dados em cache**: mostrar em todas as telas quando o dado veio do cache do banco e há quanto tempo, não só na tela de ETL.
5. **Retenção do histórico**: limpeza automática de registros de sincronização com mais de 90 dias, para a tabela não crescer sem limite.

## P2 — Funcionalidades novas

6. **Busca global (Ctrl+K)**: procurar OS, ativo, técnico ou tag e ir direto ao registro.
7. **Favoritos / filtros salvos**: salvar combinações de filtros por usuário (persistidas no banco).
8. **Comparativo de períodos em Relatórios**: semana atual vs. anterior, mês vs. mês, com variação percentual.
9. **Alertas configuráveis de temperatura**: limite e janela de tolerância ajustáveis por câmara, hoje fixos em 4h.
10. **Exportação agendada**: gerar o resumo executivo em PDF automaticamente toda segunda-feira.

## P3 — Qualidade e experiência

11. **Modo offline básico**: manter o último snapshot no navegador e exibir aviso claro quando a rede cair.
12. **Acessibilidade**: revisão de contraste, foco visível e navegação por teclado nas tabelas.
13. **Testes E2E dos fluxos críticos**: login, sincronização, filtro de datas e exportação.
14. **Performance das tabelas grandes**: virtualização em Programação e Plano de Manutenção.

## Detalhes técnicos

- Papéis: nova função de servidor autenticada para conceder/remover papel, sempre validando no backend que quem chama é admin; a tabela `user_roles` continua sem escrita direta pelo cliente.
- Alerta de ETL: derivado da consulta já existente de `sync_log`, sem nova tabela.
- Retenção: função no banco agendada pelo cron já configurado.
- Filtros salvos: nova tabela com regras de acesso restritas ao próprio usuário.
- Nada de dados inventados: telas sem dado continuam mostrando "Não disponível".

## Próximo passo

Escolha os itens que quer nesta rodada. Sugestão: itens 1 e 2 (P0) primeiro, pois destravam o acesso administrativo, e depois 3 e 4.
