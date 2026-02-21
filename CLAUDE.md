# Assist (fluxo-de-caixa-pessoal) — CLAUDE.md

## 0) Mission (WHY)
Build **Assist**, a calm, voice-first personal finance system:
- **Frictionless capture** (speak → transaction).
- **Trustworthy math** (never wrong balances, bills, installments, recurring).
- **Direction** (weekly/monthly diagnosis), with **evidence on demand**.
- **No judgment**. Tone is calm, human, sophisticated.

We are not building an endless "feature monster".
We optimize for: **retention, clarity, correctness, minimal UI**.

## 1) Repo architecture (WHAT exists today)
This is a full-stack web app:
- Frontend: Vite + React 19 + TypeScript + Tailwind CSS
- Backend: Cloudflare Workers + Hono + TypeScript
- Auth: Firebase Auth
- DB: Firestore (`firestore.rules` + `firestore.indexes.json` at repo root)
- Voice: Whisper transcription + GPT parsing (backend routes)

Folders:
- `/frontend` (React app)
  - `/frontend/src/domain` — pure business logic + tests (do not embed rules in UI)
  - `/frontend/src/i18n` — translations (Portuguese, English, Spanish)
- `/backend` (Workers API)
- `/plans` (project docs / feature plans)

## 2) Single-tier monetization (non-negotiable)
**One paid subscription only** (all features included).
No Essential vs Premium feature splits.
A trial is allowed (7–14 days), but the product stays "one tier".

## 3) Product guardrails (WHAT must remain true)
### 3.1 Home rule ("10 seconds")
The home experience must be minimal:
- This month: income, expenses, net
- Projection (end of month)
- Impact until December (year-end direction)
- Latest transactions (3–5)
- One strong "Add transaction" CTA (voice + fallback manual)

**Everything else belongs behind drill-down** ("See why / Details").

### 3.2 Voice-first rules
- Default account/card wins unless overridden ("no Santander").
- Category selection = closest match among user categories.
- Avoid extra questions in MVP. Prefer best-effort parsing.

### 3.3 Trust > features
Money logic must be deterministic, testable, and explainable:
- installments distribution
- credit card bills debiting linked account on due date
- recurring rules and edits
- month rollover logic
- multi-currency / FX transfers (per-account currency, implied rate)

## 4) Current implementation notes (HOW it works today)
### 4.1 Backend routes
Main API mounts:
- `/api/transactions`, `/api/accounts`, `/api/credit-cards`, `/api/credit-card-bills`
- `/api/reports`, `/api/voice`
- `/api/budgets`, `/api/categories`
- `/api/families`, `/api/familyData`

### 4.2 Voice pipeline
- Client: `useVoiceRecorder()` hook — `useReducer` state machine with states including `permission_denied`. User must pass `VoiceConsentModal` before voice is enabled.
- Server: audio uploaded as `multipart/form-data` → Whisper transcription → GPT parsing → matches categories, accounts (incl. cash flag), credit cards.
- For creates: persists to Firestore.
- For "pending updates": returns updated draft (no persistence).

IMPORTANT:
- Parsing must respect current date and language.
- Description must be returned in user language.

### 4.3 Domain-first pure functions (with tests)
All money logic lives in `frontend/src/domain/`. UI components must not embed business rules.

| File | Responsibility |
|---|---|
| `creditCardSchedule.ts` | Installment generation (15+ tests) |
| `billing.ts` | Bill calculations |
| `recurrence.ts` | Recurring series generation |
| `projections.ts` | Month-end projections |
| `diagnosis.ts` | Financial health checks |

Run tests: `cd frontend && npm run test`

### 4.4 Key features shipped (do not re-plan)
- **Multi-currency / FX transfers** — per-account currency, implied exchange rate display
- **Family sharing** — granular permissions per entity type (`/api/families`, `/api/familyData`)
- **i18n** — Portuguese, English, Spanish (`frontend/src/i18n/`)
- **Design tokens** — CSS custom properties for color, radius, shadow (`frontend/src/styles/`)
- **Weekly review** — upcoming recurring transactions shown on dashboard
- **Credit card scheduling** — bill due date logic, installment numbering, 30+ tests
- **Recurring transactions** — bulk edit modes: single / forward / all

## 5) Commands (copy/paste)
### 5.1 Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
npm run lint
npm run build
npm run test        # run domain tests once
npm run test:watch  # watch mode
npm run deploy
```

### 5.2 Backend
```bash
cd backend
npm install
npm run dev
npm run lint
npm run typecheck
npm run deploy
```

## 6) Environment variables (must not leak)
### 6.1 Frontend (`.env`)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

### 6.2 Backend (wrangler)
`wrangler.toml` has `FIREBASE_PROJECT_ID`. Secrets are set via:
```bash
wrangler secret put FIREBASE_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put RESEND_API_KEY  # optional
```
Never commit real keys. If a key appears in git history, rotate it.

## 7) Coding conventions (HOW to change code safely)
### 7.1 Prefer "domain-first" for money logic
Any money math must be isolated (pure functions) in `frontend/src/domain/`.
UI components should not embed business rules.

### 7.2 Avoid large UI changes
Minimal changes per PR.
No new navigation items unless absolutely required.

### 7.3 Error handling
- Backend: return `{ success: false, error: "..." }` with correct HTTP codes.
- Frontend: show calm, actionable messages (no technical stack traces).

## 8) Tone & copy rules (user-facing)
Calm, concise, neutral.

Prefer: "Seu ritmo projeta…" / "Se quiser, podemos ajustar…"

Avoid: blame, shame, hype, exclamation overload.

## 9) Testing / release checklist (money is sacred)
Before shipping anything that touches transactions:

- [ ] Installments distribution tests
- [ ] Credit card bill debit date tests
- [ ] Recurring edit modes tests (single / forward / all)
- [ ] Month boundary tests
- [ ] "Default account" override tests (voice parsing)
- [ ] Multi-currency / FX transfer tests (when touching account currency logic)
- [ ] Family permission tests (when touching family data access)

If tests do not exist yet, create them before refactoring.

## 10) Roadmap alignment (keep it minimal)
Next improvements must fall into one bucket:

- Reduce friction (faster input, fewer taps)
- Increase trust (correctness, transparency)
- Increase retention (weekly/monthly diagnosis)
- Improve clarity (10-second home, drill-down evidence)

Reject everything else for now (especially Open Finance).
