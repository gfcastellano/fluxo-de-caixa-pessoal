# plans/assist-home-minimal.md
> Objetivo: transformar o Dashboard atual na **Home minimalista (regra dos 10 segundos)** sem quebrar lógica, relatórios, family mode ou multi-moeda.  
> Estratégia: refatorar primeiro (sem mudar UI), depois reorganizar UI e adicionar projeções com método explicável.

## Definição de “Home minimalista”
A Home deve mostrar (somente):
1) **Este mês**: Receita, Despesa, Resultado (net)  
2) **Projeção do mês**: “Mantendo este ritmo, você terminará o mês com …”  
3) **Impacto até dezembro**: projeção anual simples, conservadora e explicável  
4) **Últimas transações**: 3–5 itens  
5) **CTA principal**: botão marcante para adicionar transação (voz + fallback manual)

Tudo que for “complexidade” (por moeda, por conta, categorias, metas, family mode details, tabelas grandes) deve ir para:
- Drill-down: “Ver detalhes / Ver por quê”
- Outra tela já existente (Reports, Accounts, etc.)
- Um drawer/modal “Detalhes” (somente se já existir padrão no app)

---

## Commit 1 — Baseline e “No UI change refactor boundary”
**Mensagem sugerida:** `refactor(dashboard): extract data loading into hook without UI changes`

### Tarefas
- [x] Criar `frontend/src/hooks/useDashboardData.ts` (ou pasta equivalente)
- [x] Mover toda lógica de fetch/transform do `Dashboard.tsx` para o hook:
  - carregamento de contas/cartões/transações/resumos
  - cálculos intermediários (sem alterar resultados)
- [x] `Dashboard.tsx` vira principalmente "render + estados" consumindo o hook
- [x] Manter UI exatamente igual (sem mudanças visuais)

### Done
- [x] App compila e o dashboard mostra os mesmos números/listas
- [x] Sem mudanças em rotas/links
- [x] Sem mudanças de comportamento

---

## Commit 2 — “View model” estável para Home (sem usar ainda)
**Mensagem sugerida:** `refactor(dashboard): introduce HomeSummary view-model`

### Tarefas
- [x] Criar um tipo `HomeSummary` com campos necessários para Home minimalista:
  - `monthIncome`, `monthExpense`, `monthNet`
  - `latestTransactions` (já ordenadas/limitadas)
  - placeholders para projeções: `monthProjectionNet?`, `yearEndProjection?`
- [x] No hook, gerar `homeSummary` **além** do que já existe (sem usar na UI)
- [x] Garantir que valores já usados hoje ainda saiam iguais (backward compatible)

### Done
- [x] Sem mudanças visuais
- [x] `homeSummary` logável/inspecionável e consistente

---

## Commit 3 — Projeção mensal explicável (função pura + testes)
**Mensagem sugerida:** `feat(projection): add explainable monthly projection with tests`

### Método recomendado (simples e transparente)
- Definir janela `N` dias (ex.: 7 ou 14) e calcular:
  - `avgDailyNet = (net dos últimos N dias) / N`
  - `projectedNet = currentMonthNet + avgDailyNet * remainingDaysInMonth`
- Explicação: “Baseado na média dos últimos N dias”.

### Tarefas
- [x] Criar `frontend/src/domain/projections.ts` com função pura:
  - `projectMonthNet({ currentNet, lastNDaysNet, remainingDays, windowDays }): { value, explanation }`
- [x] Implementar testes (onde você já testa hoje; se não existir infra, criar `vitest` mínimo no frontend):
  - casos: remainingDays=0, N=7, N=14, valores negativos, etc.
- [x] No hook, calcular `monthProjection` e preencher em `homeSummary`

### Done
- [x] Testes verdes
- [x] Projeção consistente e "explicável" em texto curto
- [x] Ainda sem mudar UI

---

## Commit 4 — Projeção até dezembro (conservadora) + testes
**Mensagem sugerida:** `feat(projection): add year-end projection based on recent months with tests`

### Método recomendado (conservador e explicável)
Opção A (mais simples):
- Use `projectedMonthNet` como “ritmo atual”
- `monthsRemaining = monthsUntilDecemberInclusiveOrExclusive` (definir claramente)
- `yearEndImpact = projectedMonthNet * monthsRemaining`
- Exibir como “Se mantiver um ritmo parecido, até dezembro…”

Opção B (um pouco melhor):
- Média dos últimos 3 meses de net (se existir histórico)
- Usar o menor valor entre (média 3 meses) e (projeção do mês atual) para ser conservador

### Tarefas
- [x] Criar função pura `projectYearEndImpact(...)` com retorno `{ value, explanation }`
- [x] Testes para:
  - falta de histórico
  - meses restantes = 0
  - comportamento conservador
- [x] No hook, preencher `homeSummary.yearEndProjection`

### Done
- [x] Testes verdes
- [x] Explicação curta pronta para UI

---

## Commit 5 — Nova Home UI (substituir “dashboardão” por “10 segundos”)
**Mensagem sugerida:** `feat(home): implement minimal Home layout using HomeSummary`

### Tarefas
- [x] Reorganizar `Dashboard.tsx` para:
  - seção "Este mês" (3 números)
  - seção "Mantendo este ritmo…" (projeção mensal)
  - seção "Até dezembro…" (impacto anual)
  - lista "Últimas transações" (3–5)
  - CTA principal "Adicionar" (voz em destaque)
- [x] Remover (da Home) componentes densos / múltiplas tabelas / breakdowns longos
- [x] Garantir que qualquer informação removida tenha caminho:
  - botão "Ver detalhes" → leva para Reports / Transactions / Accounts (o que já existir)
- [x] Manter family mode funcionando (mas fora do "centro"):
  - ex.: um ícone discreto / link "Família" ou manter no menu existente

### Done
- [x] Home abre e em 10s o usuário entende tudo
- [x] Sem regressão de navegação
- [x] Sem perdas de funcionalidades (só mudança de "onde aparece")

---

## Commit 6 — “Ver por quê” (evidência sob demanda)
**Mensagem sugerida:** `feat(home): add drill-down evidence for projections and diagnosis`

### Tarefas
- [ ] Para projeções: adicionar link “Ver por quê” abrindo:
  - mini modal/drawer OU navegação para página de detalhes
  - mostrando:
    - média usada (N dias)
    - dias restantes
    - tabela simples / mini gráfico (se já existir infra de gráficos)
- [ ] Garantir que explicação bate com método da função pura

### Done
- [ ] Usuário consegue justificar projeção sem encher a Home
- [ ] Nenhum gráfico obrigatório na Home

---

## Commit 7 — Diagnóstico semanal/mensal (MVP textual) na Home
**Mensagem sugerida:** `feat(diagnosis): add calm weekly/monthly diagnosis summary`

### Tarefas
- [ ] Criar `frontend/src/domain/diagnosis.ts` com funções puras para gerar:
  - 1–3 insights curtos (calmos, sem julgamento)
  - baseados em:
    - % categorias dentro do orçamento (se houver orçamento)
    - progresso nas metas
    - tendência do net
- [ ] Mostrar na Home um card compacto “Resumo” (máx 3 linhas)
- [ ] Link “Ver detalhes” → Reports

### Done
- [ ] Linguagem no tom correto (“Seu ritmo projeta…”, “Se quiser…”)
- [ ] Sem coach, sem culpa

---

## Commit 8 — CTA de transação: foco em voz + fallback manual
**Mensagem sugerida:** `feat(home): make Add Transaction CTA prominent (voice-first)`

### Tarefas
- [ ] Botão principal abre fluxo de voz (se já existe)
- [ ] Fallback manual acessível (ex.: botão secundário ou dentro do mesmo modal)
- [ ] Garantir que o fluxo respeita:
  - default account/card
  - override por voz (Santander)
- [ ] Adicionar 2–3 exemplos na UI (placeholder/hint) sem poluir

### Done
- [ ] Input por voz é a ação mais óbvia da Home
- [ ] Manual não some

---

## Commit 9 — Regressão financeira: suíte mínima de testes (dinheiro sagrado)
**Mensagem sugerida:** `test(finance): add regression tests for installments, bills, month rollover`

### Tarefas
- [ ] Criar/expandir testes para:
  - parcelamento (distribuição por mês)
  - fatura do cartão (débito no vencimento)
  - virada de mês (resumo e projeção não quebram)
  - default vs override (simulado no parser pós-processamento, se existir)
- [ ] Se parte estiver no backend, adicionar testes equivalentes lá também

### Done
- [ ] Cobertura mínima para evitar “saldo errado”
- [ ] CI local passa (lint + typecheck + tests)

---

## Commit 10 — Polimento final e “não quebrar nada”
**Mensagem sugerida:** `chore(home): cleanup, perf, and navigation consistency`

### Tarefas
- [ ] Remover código morto do Dashboard antigo (mas só após confirmar que nada usa)
- [ ] Otimizar queries/fetch para evitar carregar dados desnecessários na Home
- [ ] Garantir loading state elegante (calmo)
- [ ] Revisar i18n (PT-BR principalmente) em todo texto novo
- [ ] Checar responsividade mobile (Home tem que ser ótima no celular)

### Done
- [ ] Home rápida e clara
- [ ] Nenhum feature quebrado
- [ ] Navegação consistente

---

# Critérios de aceite (final)
- [ ] Home segue a regra dos 10 segundos
- [ ] Projeções existem e são explicáveis (“ver por quê”)
- [ ] Diagnóstico aparece de forma discreta e útil
- [ ] Voz é a ação principal
- [ ] Nada “sumiu”: apenas foi movido para drill-down/telas existentes
- [ ] Testes cobrem o essencial do dinheiro

---