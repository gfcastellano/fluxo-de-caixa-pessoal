# Assist (fluxo-de-caixa-pessoal) — Plano de Execução (para Claude Code)
> **Adaptação do plano** ao seu **CLAUDE.md atual** e aos guardrails do Assist.
> **Escopo:** UI/UX premium (tokens, nav, gráficos, botão de áudio), confiabilidade (cartão/parcelas/datas + testes), lembretes semanais de recorrências, transferências multi-moeda/contas, metadados de usuário.
> **Fora do escopo agora:** **liberação do usuário/pagamento/paywall** (adiado enquanto estamos em testes).
>
> **Status: ✅ CONCLUÍDO** — todos os 9 commits entregues e merged em `main` (2026-02-20).

---

## 0) Regras operacionais (não negociáveis)
1) **Home rule ("10 seconds")**: nada de inflar a Home. Tudo que não for essencial vai para drill-down ("Ver por quê / Detalhes").
2) **Trust > features**: qualquer mudança que toque em dinheiro exige **lógica determinística + testes**.
3) **Domain-first**: regras de parcelas, faturas, recorrência, projeções e FX devem ficar em **funções puras** (sem UI/Firestore).
4) **PRs pequenos**: cada PR/commit deve ser revisável em 5–15 minutos.
5) **Sem monetização agora**: não implementar paywall/liberação; se existir scaffold, manter como está.
6) **Tom do produto**: calmo, sofisticado, sem julgamento (copys e mensagens).

---

## 1) Fase 1 — Reconhecimento do repositório ✅
### 1.1 Objetivo
Construir um "mapa real" do código para evitar suposições e orientar commits cirúrgicos.

**Entregável:** `plans/impl-map.md` criado com mapa completo de domínios, arquivos e riscos.

---

## 2) Fase 2 — UI premium sem quebrar a Home minimalista

### Commit 1 — Design Tokens ✅
**Commit:** `e9cf987`
CSS custom properties criadas em `frontend/src/styles/tokens.css` e mapeadas no `tailwind.config.js`. Tokens aplicados em `Button.tsx`, `Card.tsx` e container principal.

---

### Commit 2 — Barra de navegação ✅
**Commit:** `1f2538e`
Touch targets 44px aplicados no `VoiceDock.tsx`. `padding-bottom: env(safe-area-inset-bottom)` adicionado para iOS. Estados ativos refinados.

---

### Commit 3 — Gráficos: ChartFrame wrapper ✅
**Commit:** `012490f`
`ChartFrame.tsx` criado com empty state padronizado e `ResponsiveContainer`. Gráficos de barra em `Reports.tsx` migrados. Tooltip fixo: âncora no topo (`position={{ y: 10 }}`), sem escape de viewport.

---

## 3) Fase 3 — Botão de áudio

### Commit 4 — Botão de gravação: máquina de estados ✅
**Commit:** `b2aad42`
`useVoiceRecorder.ts` migrado de `useState` para `useReducer` com ações explícitas (`START`, `STOP`, `UPLOAD_START`, `UPLOAD_OK`, `UPLOAD_ERR`, `PERMISSION_DENIED`). Estado `PERMISSION_DENIED` com mensagem calma adicionado.

---

## 4) Fase 4 — Cartão de crédito (corretude e testes)

### Commit 5 — Motor de parcelas (funções puras) ✅
**Commit:** `e89e8ca`
`frontend/src/domain/creditCardSchedule.ts` criado com `generateInstallments()`. Reutiliza `calculateBillDate()` existente. Tipo `Installment` adicionado a `types/index.ts`.

---

### Commit 6 — Testes do motor do cartão ✅
**Commit:** `e89e8ca` (mesmo commit)
15 testes cobrindo: compra antes/no/depois do fechamento, fevereiro (28/29 dias), fechamento dia 31 em meses curtos, virada de ano, 3 e 12 parcelas. Todos passando com Vitest.

---

## 5) Fase 5 — Recorrências

### Commit 7 — Weekly Review ✅
**Commit:** `6f27ef0`
`useWeeklyReview.ts` + `WeeklyReview.tsx` criados. Seção adicionada ao `Dashboard.tsx` mostrando recorrências pendentes nos próximos 7 dias. Confirmar em 2 toques, editar valor inline.

---

## 6) Fase 6 — Transferência FX

### Commit 8 — Modelo composto de transferência ✅
**Commit:** `263df1e`
`amountTo`, `impliedRate` adicionados ao tipo `Transaction`. `TransactionModal.tsx` exibe campos FX e taxa implícita para transferências cross-currency. `reportService.ts` corrigido para usar `amountTo` nos relatórios. `Transactions.tsx` exibe `→ €X.XXX` nas 3 views.

**Bug fixes incluídos:**
- `79e1100` — Overflow-hidden removido do `card.base`; FX amount corrigido no `reportService`
- `7647b5e` — Tooltip ancorado ao topo; `amountTo` exibido em `Transactions.tsx`
- `943c2a4` — Tooltip restrito ao viewport horizontal no mobile

---

## 7) Fase 7 — Metadados do usuário

### Commit 9 — Schema de user metadata ✅
**Commit:** `7f5582d`
`useUserSetup.ts` estendido: novos usuários recebem `locale`, `timezone`, `defaultCurrency`, `enabledCurrencies`, `privacyMode`, `notificationPrefs`, `onboardingVersion`. Usuários existentes recebem upsert seguro via `setDoc(..., { merge: true })`.

---

## 8) Definition of Done ✅
Todos os commits passaram em:
- `cd frontend && npm run lint && npm run build`
- `cd frontend && npm test` (onde aplicável)
- Revisão visual em 375px (iPhone SE) e 1280px (desktop)

---

## 9) Checklist de riscos e mitigação ✅
- **Cartão espalhado** → motor puro em `creditCardSchedule.ts` + 15 testes ✅
- **Gráficos confusos** → `ChartFrame` wrapper + tooltip fixo ✅
- **Botão de áudio trava** → `useReducer` state machine + `PERMISSION_DENIED` ✅
- **FX duplica dinheiro** → `amountTo`/`impliedRate` + fix no `reportService` ✅

---

## 10) Entregáveis finais ✅
1. ✅ 9 commits + 3 bug-fix commits, todos em `main`
2. ✅ `plans/impl-map.md` — mapa real do repositório
3. ✅ 15 testes de cartão passando
4. ✅ `plans/next-steps.md` — resumo do que foi feito e próximos passos

---

## 11) Nota sobre monetização (adiado)
Embora o produto tenha "Single-tier monetization (non-negotiable)" no `CLAUDE.md`, **nenhuma implementação de liberação/pagamento deve ser feita agora**.
Somente manter a arquitetura existente sem expandir, até nova instrução.
