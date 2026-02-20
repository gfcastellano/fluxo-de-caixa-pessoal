# Assist (fluxo-de-caixa-pessoal) — Plano de Execução (para Claude Code)
> **Adaptação do plano** ao seu **CLAUDE.md atual** e aos guardrails do Assist.  
> **Escopo:** UI/UX premium (tokens, nav, gráficos, botão de áudio), confiabilidade (cartão/parcelas/datas + testes), lembretes semanais de recorrências, transferências multi-moeda/contas, metadados de usuário.  
> **Fora do escopo agora:** **liberação do usuário/pagamento/paywall** (adiado enquanto estamos em testes).

---

## 0) Regras operacionais (não negociáveis)
1) **Home rule (“10 seconds”)**: nada de inflar a Home. Tudo que não for essencial vai para drill-down (“Ver por quê / Detalhes”).  
2) **Trust > features**: qualquer mudança que toque em dinheiro exige **lógica determinística + testes**.  
3) **Domain-first**: regras de parcelas, faturas, recorrência, projeções e FX devem ficar em **funções puras** (sem UI/Firestore).  
4) **PRs pequenos**: cada PR/commit deve ser revisável em 5–15 minutos.  
5) **Sem monetização agora**: não implementar paywall/liberação; se existir scaffold, manter como está.  
6) **Tom do produto**: calmo, sofisticado, sem julgamento (copys e mensagens).

---

## 1) Fase 1 — Reconhecimento do repositório (obrigatória antes de codar)
### 1.1 Objetivo
Construir um “mapa real” do código para evitar suposições e orientar commits cirúrgicos.

### 1.2 O que o Claude Code deve fazer
1) Ler `CLAUDE.md` e validar mentalmente os guardrails (Home/Voice/Trust).  
2) Mapear estrutura e pontos de verdade:
   - Frontend: `frontend/` (Vite + React + TS + Tailwind)
   - Backend: `backend/` (Cloudflare Workers + Hono + TS)
   - Planos: `plans/`
3) Descobrir os arquivos reais de:
   - tokens/tema (ou ausência)
   - navegação
   - gráficos
   - botão de gravação + pipeline (upload/transcrição)
   - modelos de cartão/fatura/parcelas
   - recorrências
   - contas/moedas/transferências
   - schemas Firestore e serviços de persistência

### 1.3 Comandos que o Claude Code deve rodar e analisar
**Root**
- `ls -la`
- `find . -maxdepth 4 -type f -name "package.json" -o -name "README.md" -o -name "tailwind.config.*" -o -name "postcss.config.*" -o -name "vite.config.*" -o -name "wrangler.toml"`

**Frontend**
- `cd frontend && ls -la`
- `cd frontend && rg -n "nav|navigation|bottom|sidebar|tabs" src`
- `cd frontend && rg -n "recharts|chart|tooltip|xAxis|yAxis|ResponsiveContainer" src`
- `cd frontend && rg -n "audio|record|mic|whisper|multipart|upload|voice" src`
- `cd frontend && rg -n "credit|card|install|parcela|fech|venc|bill|statement" src`
- `cd frontend && rg -n "recorr|recurring|repeat|weekly|monthly" src`
- `cd frontend && rg -n "EUR|BRL|fx|transfer|exchange|currency" src`

**Backend**
- `cd backend && ls -la`
- `cd backend && rg -n "/api/voice|whisper|transcrib|parse|gpt" src`
- `cd backend && rg -n "/api/credit|bill|statement|install|parcela|recorr" src`
- `cd backend && rg -n "firestore|collections|doc\\(|set\\(|update\\(" src`

### 1.4 Entregável obrigatório desta fase
Criar um arquivo curto em `/plans/`:
- `plans/impl-map.md` contendo:
  - Lista de arquivos e pastas encontrados por domínio:
    - UI tokens/tema, nav, gráficos, áudio, cartão, recorrências, moedas/transfer
  - Onde está a lógica hoje (e se está espalhada)
  - Riscos (ex.: regras duplicadas, datas em múltiplos lugares)
  - Recomendação de centralização (onde criar “domain modules”)

> **Sem este mapa, não iniciar refactors.**

---

## 2) Fase 2 — UI premium sem quebrar a Home minimalista

### Commit 1 — Design Tokens (fundação visual)
**Objetivo:** estabelecer tokens (cores, tipografia, radius, spacing, sombras) como fonte única de verdade e começar adoção incremental.

**O que fazer (frontend):**
1) Identificar o padrão atual (Tailwind-only? CSS vars? ambos?).  
2) Criar tokens (preferência: CSS variables + mapeamento Tailwind, se fizer sentido):
   - `--bg`, `--surface`, `--text`, `--muted`, `--primary`, `--border`
   - `--radius-sm/md/lg`, `--shadow-1/2`
   - escala de spacing (4/8/12/16/24/32)
3) Aplicar tokens em 1–2 componentes base:
   - container principal
   - card base
   - botão primário

**Critérios de aceite:**
- Build passa (`npm run build`).
- Visual não “explode” em telas principais.
- Tokens são usados de verdade (não só definidos).

**DoD do commit:**
- `cd frontend && npm run lint && npm run build`

---

### Commit 2 — Barra de navegação (refino premium + mobile)
**Objetivo:** nav confortável e premium, sem adicionar itens e sem aumentar complexidade.

**O que fazer:**
1) Localizar componente de nav e seus estilos.  
2) Ajustar:
   - touch targets 44–48px
   - estado ativo/inativo claro e discreto
   - safe-area no mobile
   - alinhamento e espaçamento
   - ícones consistentes (mesmo estilo/tamanho)
3) Garantir que a nav não consuma atenção da Home.

**Critérios de aceite:**
- Navegação com polegar funciona bem.
- Sem shifts/overflows.
- Estados consistentes com tokens.

**DoD:**
- build + navegação manual: Home → outras abas → Home

---

### Commit 3 — Gráficos: padrão de interação e legibilidade
**Objetivo:** gráficos consistentes e “calmos”: tooltip previsível, empty states elegantes, interação mobile.

**O que fazer:**
1) Identificar lib (provável Recharts).  
2) Criar `GraphCard` / `ChartFrame` (componente base) com:
   - título/subtítulo
   - tooltip padrão (formatação de moeda e data)
   - empty state (“Sem dados ainda”) + dica curta
   - seletor simples de período (mínimo: 30d e 3m), sem entulhar UI
3) Migrar 1–2 gráficos principais para usar o wrapper.

**Critérios de aceite:**
- Tooltip funciona no touch.
- Empty state não parece erro.
- Performance ok (sem re-render agressivo).

**DoD:**
- `npm run build`
- checar gráficos no mobile width (responsividade)

---

## 3) Fase 3 — Botão de áudio (herói da Home; voice-first)

### Commit 4 — Botão de gravação: máquina de estados + feedback premium
**Objetivo:** refinar o CTA principal (“Add transaction”) com estados claros e feedback visual.

**Estados obrigatórios:**
- `idle`
- `recording`
- `processing`
- `error`

**O que fazer (frontend):**
1) Encontrar o componente atual de gravação.  
2) Implementar state machine explícita (ex.: reducer):
   - ações: `START`, `STOP`, `UPLOAD_START`, `UPLOAD_OK`, `UPLOAD_ERR`, `PERMISSION_DENIED`
3) Feedback:
   - pulse/ripple durante `recording`
   - timer ou anel de progresso (mínimo: timer)
   - botão desabilitado durante `processing` (evitar double submit)
4) Permissões:
   - ao negar mic: mensagem calma + orientação de correção
5) Garantir fallback manual continue existindo e acessível.

**Critérios de aceite:**
- Começa e para sem travar.
- Erro de permissão bem tratado.
- Não duplica requests.

**DoD:**
- `npm run build`
- teste manual: gravar 2x, cancelar, negar permissão, gravar novamente

---

## 4) Fase 4 — Cartão de crédito (corretude e testes)

> **Guarda-chuva:** “Money logic must be deterministic, testable, and explainable.”  
> Portanto: **motor puro + testes antes de qualquer refino de UI relacionado a cartão.**

### Commit 5 — Isolar motor de parcelas/faturas (funções puras)
**Objetivo:** consolidar regras de fechamento/vencimento/parcelas em um módulo de domínio (sem UI/Firestore).

**O que fazer:**
1) Localizar onde hoje:
   - parcelas são geradas
   - faturas são calculadas
   - datas são atribuídas
2) Criar módulo de domínio em frontend (ou shared) como:
   - `frontend/src/domain/creditCardSchedule.ts`
3) Expor função:
   - `generateInstallments({ purchaseDate, amount, installments, closingDay, dueDay, timezone }): Installment[]`
4) `Installment` mínimo:
   - `index` (1..N)
   - `amount`
   - `statementMonth` (competência)
   - `dueDate`
   - `installmentId`/`externalRef` (se necessário)
5) Remover regra duplicada dos componentes: UI apenas chama o motor.

**Critérios de aceite:**
- Motor é puro e testável.
- App continua funcionando.
- Nenhum cálculo fica “espalhado” em componente.

**DoD:**
- `npm run build`

---

### Commit 6 — Testes do motor do cartão (matriz de bordas)
**Objetivo:** criar testes que garantem que “nunca erra” em cenários reais.

**O que fazer:**
1) Descobrir framework de testes no repo (Vitest/Jest).  
2) Criar testes cobrindo:
   - compra no dia anterior ao fechamento, no dia do fechamento, e no dia seguinte
   - fevereiro (28/29)
   - fechamento 31 em meses sem 31
   - virada de ano (dez→jan)
3) Validar:
   - número de parcelas
   - `statementMonth` correto
   - `dueDate` correto e consistente

**Critérios de aceite:**
- Testes passam localmente e no CI (se existir).
- Pelo menos 8–12 cenários.

**DoD:**
- `npm test` (ou equivalente) + `npm run build`

---

## 5) Fase 5 — Recorrências: lembrete semanal para confirmar previsto vs real

### Commit 7 — Weekly Review (sem depender de push no MVP)
**Objetivo:** aumentar confiança e retenção: revisão semanal leve, sem fricção.

**O que fazer:**
1) Mapear como recorrências funcionam hoje (rules, geração, edição).  
2) Implementar “Revisar esta semana” como seção:
   - lista de recorrências esperadas
   - cada item: Confirmar / Editar valor
   - ao confirmar/editar: grava “real” e vincula à recorrência
3) Se já existir infra de notificações, opcional:
   - criar lembrete semanal
   - se não existir: manter in-app.

**Critérios de aceite:**
- Confirmar em 2 toques.
- Valor confirmado reflete em relatórios/mês corrente.

**DoD:**
- `npm run build` + teste manual simples com 1 recorrência

---

## 6) Fase 6 — Transferência entre moedas e contas (FX explícito e auditável)

### Commit 8 — Modelo composto de transferência (transferId + taxa implícita)
**Objetivo:** registrar transferência BRL↔EUR de forma coerente e rastreável.

**O que fazer:**
1) Criar entidade `Transfer`:
   - `transferId`
   - `fromAccountId`, `toAccountId`
   - `amountFrom`, `currencyFrom` (BRL)
   - `amountTo`, `currencyTo` (EUR)
   - `impliedRate = amountFrom / amountTo`
   - `timestamp`, `notes`, `fees?`
2) Persistência:
   - preferível: uma doc “transfer”
   - alternativa: 2 transações vinculadas via `transferId`
3) UI mínima:
   - usuário informa BRL e EUR
   - exibir taxa implícita
   - salvar e aparecer no histórico (com referência cruzada)

**Critérios de aceite:**
- Não duplica dinheiro nos relatórios.
- Histórico rastreável.
- Taxa implícita calculada e exibida.

**DoD:**
- `npm run build` + teste manual com 1 transferência

---

## 7) Fase 7 — Metadados do usuário (preparação para o futuro)

### Commit 9 — Schema de user metadata + migração segura
**Objetivo:** criar metadados úteis sem invadir privacidade e sem quebrar usuários existentes.

**Campos sugeridos:**
- `locale`, `timezone`
- `defaultCurrency`, `enabledCurrencies`
- `notificationPrefs`
- `privacyMode` (ocultar valores)
- `createdAt`, `lastActiveAt`
- `onboardingVersion`

**O que fazer:**
1) Mapear onde o “user doc” é criado/atualizado hoje.  
2) Implementar upsert/migração:
   - preencher defaults faltantes
   - não sobrescrever valores existentes
3) Garantir que serviços/queries tolerem campos ausentes.

**Critérios de aceite:**
- Usuários atuais continuam funcionando.
- Novos usuários recebem defaults corretos.

**DoD:**
- `npm run build` + teste de login/criação de user doc

---

## 8) Definition of Done (DoD) geral por commit/PR
Antes de finalizar qualquer commit/PR, o Claude Code deve:

1) Rodar:
   - Frontend: `cd frontend && npm run lint && npm run build`
   - Backend (se mexer): `cd backend && npm run lint && npm run typecheck && npm run deploy` (apenas se necessário)
2) Verificar UI em dois widths:
   - mobile (ex.: 390px)
   - desktop (ex.: 1280px)
3) Validar guardrails:
   - Home continua minimalista
   - Voice-first: fallback manual mantém acessibilidade
   - Money logic: se tocou em dinheiro, tem teste

---

## 9) Checklist de riscos e mitigação
### Risco: regra de cartão espalhada e inconsistência em datas
**Mitigação:** motor puro + matriz de testes (Commits 5 e 6) antes de mexer em UI de cartão.

### Risco: gráficos lindos, mas confusos/enganosos
**Mitigação:** wrapper único + formatação e filtros centralizados (Commit 3).

### Risco: botão de áudio falha em permissões e duplica requests
**Mitigação:** state machine + estados `processing/error` e bloqueio de múltiplos envios (Commit 4).

### Risco: FX virar duas transações soltas e bagunçar relatórios
**Mitigação:** modelo composto com `transferId` e taxa implícita (Commit 8).

---

## 10) Entregáveis finais esperados
1) Commits/PRs pequenos e claros, com mensagens objetivas.
2) `plans/impl-map.md` (mapa real do repo e caminhos dos componentes).
3) Testes de cartão rodando e passando.
4) `plans/next-steps.md` resumindo:
   - o que foi feito
   - o que falta
   - como testar (áudio/cartão/recorrências/FX)

---

## 11) Nota sobre monetização (adiado)
Embora o produto tenha “Single-tier monetization (non-negotiable)” no `CLAUDE.md`, **nenhuma implementação de liberação/pagamento deve ser feita agora**.  
Somente manter a arquitetura existente sem expandir, até nova instrução.