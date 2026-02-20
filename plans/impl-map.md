# Assist — Mapa de Implementação (impl-map)

> Gerado em 2026-02-20 via reconhecimento completo do repositório.
> Atualizar quando arquivos críticos mudarem de lugar.

---

## Estrutura raiz

```
frontend/   Vite + React + TypeScript + Tailwind
backend/    Cloudflare Workers + Hono + TypeScript
plans/      Documentação e planos de features
```

---

## 1. UI — Tokens / Tema

| Arquivo | O que contém |
|---------|-------------|
| `frontend/tailwind.config.js` | Extensão de tema: cores custom (`ink`, `slate`, `mist`, `blue`, `emerald`, `rose`, `amber`), `clamp()` nas fontes |
| `frontend/src/styles/design-system.ts` | Classes Tailwind exportadas como strings: button variants, card, input, modal, badge, alert, layout |
| `frontend/src/index.css` | CSS base (Tailwind layers). **Ainda sem CSS custom properties** |

**Status**: tokens existem como classes Tailwind, mas sem CSS variables — não suporta dark mode / theming dinâmico.
**Risco**: adoção inconsistente — alguns componentes usam classes inline em vez de `design-system.ts`.
**Recomendação**: adicionar `:root { --color-* }` em `tokens.css` e mapear no `tailwind.config.js`.

---

## 2. Navegação

| Arquivo | O que contém |
|---------|-------------|
| `frontend/src/components/Layout.tsx` | Layout principal; navbar tablet (L133-152) e desktop (L157-191); define `navItems[]` com rotas |
| `frontend/src/components/VoiceDock.tsx` | Dock mobile bottom; 7 itens + VoiceHeroButton central |
| `frontend/src/components/UserDropdown.tsx` | Menu de perfil (configurações, logout) |
| `frontend/src/components/FamilyToggle.tsx` | Alternância personal/family |

**Itens de nav** (definidos em `Layout.tsx`):
`Dashboard`, `Transactions`, `Categories`, `Accounts`, `CreditCards`, `Budgets`, `Reports`

**Status**: navegação responsiva funcionando. Ativa usa `bg-blue/10 text-blue`.
**Risco**: touch targets no `VoiceDock` não verificados (mínimo 44px). Sem `safe-area-inset-bottom` no iOS.

---

## 3. Gráficos

| Arquivo | O que contém |
|---------|-------------|
| `frontend/src/pages/Reports.tsx` | **Único lugar** com gráficos: PieChart, BarChart, LineChart (Recharts v3) |

**Sem wrapper centralizado** — cada gráfico tem tooltip, empty state e seletor próprio (ou sem).
**Risco**: inconsistência visual entre gráficos; formatação de moeda não padronizada.
**Recomendação**: criar `frontend/src/components/ChartFrame.tsx` e migrar.

---

## 4. Botão de áudio / Pipeline de voz

| Arquivo | O que contém |
|---------|-------------|
| `frontend/src/hooks/useVoiceRecorder.ts` | Gravação de áudio (MediaRecorder); estados via `useState`; `getAudioLevel()` |
| `frontend/src/hooks/useVoiceForm.ts` | Wrapper de alto nível; beep de feedback; auto-reset |
| `frontend/src/context/VoiceContext.tsx` | Orquestração (~439 linhas): roteamento por tipo de página, consent, upload, criação de itens |
| `frontend/src/components/VoiceHeroButton.tsx` | CTA principal; exibe ícone por estado e tipo de página |
| `frontend/src/components/VoiceRecordingPill.tsx` | UI durante gravação; waveform canvas; cancelar / confirmar |
| `frontend/src/components/VoiceConsentModal.tsx` | Consent gate (primeira vez) |
| `frontend/src/services/voiceService.ts` | Integração HTTP com backend (multipart upload) |

**Estados atuais** (`useVoiceRecorder`): `idle | recording | preview | processing | success | error`
**Faltando**: estado `PERMISSION_DENIED` explícito; state machine via `useReducer`.
**Risco**: `VoiceContext` acumula muitas responsabilidades — potencial source of race conditions.

---

## 5. Cartão de crédito / Parcelas / Faturas

### Domínio puro (frontend)

| Arquivo | Função | Status |
|---------|--------|--------|
| `frontend/src/domain/billing.ts` | `calculateBillDate(transactionDate, closingDay, dueDay)` | ✅ Puro, testado |
| `frontend/src/domain/billing.test.ts` | 12 testes para `calculateBillDate` | ✅ Passando |

**NÃO existe**: `generateInstallments()` para parcelamento (3x, 6x no cartão).
Apenas `calculateBillDate` resolve "em que fatura vai esta compra" — mas não gera a série completa de parcelas.

### Backend (espelho)

| Arquivo | Função |
|---------|--------|
| `backend/src/routes/transactions.ts` L282-347 | `ensureBillForDate()` — cria ou recupera fatura no Firestore |
| `backend/src/routes/transactions.ts` L351-437 | `generateRecurringInstancesWithCount()` — gera N instâncias (usado para parcelamento também) |

### Serviços frontend

| Arquivo | Função |
|---------|--------|
| `frontend/src/services/creditCardService.ts` | CRUD de cartões |
| `frontend/src/services/creditCardBillService.ts` | CRUD de faturas; `calculateAccountBalance()` |

**Risco crítico**: total de fatura atualizado em 3 lugares:
1. Backend — criação de transação
2. Backend — geração de instâncias recorrentes
3. Frontend — `creditCardBillService` direto

**Risco de inconsistência de índice de mês**: `calculateBillDate` retorna mês 0-based; alguns comentários em `creditCardBillService.ts` (L230) sugerem 1-based.

---

## 6. Recorrências

| Arquivo | O que contém |
|---------|-------------|
| `frontend/src/domain/recurrence.ts` | `getNextDate(currentDate, pattern, recurrenceDay)` — puro |
| `frontend/src/domain/recurrence.test.ts` | 30 testes (weekly/monthly/yearly, bordas de mês, fev 29) |
| `backend/src/routes/transactions.ts` L442-560 | `generateRecurringInstances()` — gera filhos até `recurrenceEndDate` |
| `backend/src/routes/transactions.ts` L639-680 | `getNextDate()` — duplicado do domínio frontend |
| `frontend/src/services/transactionService.ts` L79-127 | `getNextDate()` legacy — **deprecated, duplicado** |

**Risco**: `getNextDate` existe em 3 lugares. Backend e frontend devem ter a mesma lógica mas podem divergir.
**Sem UI** de revisão semanal ("confirmar previsto vs. real").
`MAX_INSTANCES_PER_REQUEST = 24` silencia geração além de 24 meses sem avisar o usuário.

---

## 7. Contas / Moedas / Transferências

| Arquivo | O que contém |
|---------|-------------|
| `frontend/src/services/accountService.ts` | CRUD contas; `calculateAccountBalance()` (L135-199) — inclui transfers |
| `backend/src/routes/accounts.ts` | API REST de contas |
| `backend/src/services/openai.ts` L124-149 | Parsing de transferências via voz (keywords: "transferir", "saque") |

**Schema de conta**: `id, userId, name, currency, balance, initialBalance, balanceDate, isDefault, isCash`
**Schema de transferência**: tipo `'transfer'` em `transactions`, campo `toAccountId` — **sem FX explícito**.

**Risco**: sem `impliedRate`, `amountFrom`, `amountTo` — não rastreável em cenários multi-moeda.
**Risco**: transferências não duplicam no DB mas dependem de lógica de saldo implícita.

---

## 8. Firestore — Coleções e persistência

| Coleção | Gerenciado por |
|---------|---------------|
| `users` | Firebase Auth + `useUserSetup.ts` |
| `categories` | `frontend/src/services/categoryService.ts` |
| `transactions` | `frontend/src/services/transactionService.ts` + backend |
| `accounts` | `frontend/src/services/accountService.ts` + backend |
| `creditCards` | `frontend/src/services/creditCardService.ts` + backend |
| `creditCardBills` | `frontend/src/services/creditCardBillService.ts` + backend |
| `budgets` | `frontend/src/services/budgetService.ts` + backend |
| `families` | `frontend/src/services/familyService.ts` |

**Duplex logic**: algumas operações são frontend-direto (Firestore SDK), outras via backend REST.
Exemplo: criação de transação pode vir de (1) form → frontend → Firestore, ou (2) voz → backend → Firestore.

**Backend Firestore** (`backend/src/services/firebase.ts`): usa REST API do Firestore (não o SDK).
**Frontend Firestore** (`frontend/src/firebase/config.ts`): usa Firebase SDK.

---

## 9. Backend — Rotas principais

| Rota | Método | Propósito |
|------|--------|-----------|
| `/api/transactions` | GET, POST | Listar / criar |
| `/api/transactions/:id` | PATCH, DELETE | Editar / excluir |
| `/api/transactions/:id/generate-recurring` | POST | Disparar geração de instâncias |
| `/api/credit-cards` | CRUD | Cartões |
| `/api/credit-card-bills/:id/pay` | POST | Pagar fatura + criar transação de pagamento |
| `/api/accounts` | CRUD | Contas |
| `/api/voice/transactions` | POST | Criar via voz (Whisper → GPT → Firestore) |
| `/api/voice/transactions/update` | POST | Atualizar via voz + persistir |
| `/api/voice/transactions/update-pending` | POST | Atualizar draft (sem persistir) |
| `/api/reports` | GET | Resumos e análises |

**Pipeline de voz**:
1. Upload multipart (`audio` blob + `language`)
2. Whisper-1 transcribe
3. GPT-4 parse com contexto (categorias, contas, cartões, data atual, idioma)
4. Persistência no Firestore via REST

---

## 10. Testes existentes

| Arquivo | Cobertura |
|---------|-----------|
| `frontend/src/domain/billing.test.ts` | 12 testes — `calculateBillDate` |
| `frontend/src/domain/recurrence.test.ts` | 30 testes — `getNextDate` |
| `frontend/src/domain/projections.test.ts` | Testes de projeções |
| `frontend/src/domain/diagnosis.test.ts` | Testes de diagnóstico |

Framework: **Vitest** (configurado no projeto).

---

## 11. Riscos consolidados

| Risco | Severidade | Localização | Mitigação |
|-------|-----------|-------------|-----------|
| `getNextDate` duplicado (3 lugares) | Média | `recurrence.ts`, `transactions.ts`, `transactionService.ts` legacy | Consolidar; deprecar legacy |
| Total de fatura em 3 caminhos | Alta | backend create + backend recurring + frontend bill service | Extrair função única de atualização |
| Índice de mês 0-based vs 1-based | Média | `billing.ts` vs comentários em `creditCardBillService.ts` | Documentar padrão e auditar |
| Sem `generateInstallments()` | Alta | `domain/` | Criar em Commit 5 |
| `MAX_INSTANCES = 24` silencioso | Baixa | `backend/routes/transactions.ts` | Retornar aviso ao usuário |
| FX sem `impliedRate` | Média | `transactions` schema | Commit 8 |
| `VoiceContext` monolítico | Média | `VoiceContext.tsx` | Refatorar gradualmente (não urgente) |
| Tokens sem CSS vars | Baixa | `design-system.ts` | Commit 1 |

---

## 12. Onde criar módulos de domínio novos

| Feature | Arquivo recomendado |
|---------|-------------------|
| Geração de parcelas | `frontend/src/domain/creditCardSchedule.ts` |
| Modelo FX de transferências | `frontend/src/domain/transfers.ts` |
| Helpers de revisão semanal | `frontend/src/domain/weeklyReview.ts` |
| Tokens CSS | `frontend/src/styles/tokens.css` |
| ChartFrame | `frontend/src/components/ChartFrame.tsx` |
