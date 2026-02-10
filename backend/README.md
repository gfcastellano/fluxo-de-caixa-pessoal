# Fluxo de Caixa Pessoal - Backend

Cloudflare Workers backend API for the Personal Cash Flow Management Application.

## Features

- **RESTful API** built with Hono framework
- **Authentication** via Firebase Auth JWT verification
- **CRUD Operations** for categories, transactions, and budgets
- **Reporting** endpoints for monthly summaries and category breakdowns
- **CORS** enabled for frontend communication

## Tech Stack

- **Runtime**: Cloudflare Workers (V8 Isolates)
- **Framework**: Hono
- **Language**: TypeScript
- **Validation**: Zod
- **Database**: Firebase Firestore (via REST API)

## Project Structure

```
src/
├── middleware/       # Middleware functions
│   └── auth.ts      # Firebase JWT verification
├── routes/          # API route handlers
│   ├── categories.ts
│   ├── transactions.ts
│   ├── budgets.ts
│   └── reports.ts
├── services/        # Business logic
│   └── firebase.ts  # Firestore REST API client
├── types/           # TypeScript definitions
│   ├── index.ts
│   └── context.ts
└── index.ts         # Main application entry
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account
- Firebase project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `wrangler.toml`:
```toml
[vars]
FIREBASE_PROJECT_ID = "your-project-id"
FIREBASE_API_KEY = "your-api-key"
```

3. Start the development server:
```bash
npm run dev
```

### Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## API Endpoints

### Health Check
- `GET /` - API status

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create a category
- `PATCH /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Create a transaction
- `PATCH /api/transactions/:id` - Update a transaction
- `DELETE /api/transactions/:id` - Delete a transaction

### Budgets
- `GET /api/budgets` - List all budgets
- `POST /api/budgets` - Create a budget
- `PATCH /api/budgets/:id` - Update a budget
- `DELETE /api/budgets/:id` - Delete a budget

### Reports
- `GET /api/reports/monthly-summary?year=2024&month=1` - Monthly summary
- `GET /api/reports/category-breakdown?year=2024&month=1&type=expense` - Category breakdown

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create an account
- `GET /api/accounts/:id` - Get a specific account
- `PUT /api/accounts/:id` - Update an account (full update)
- `PATCH /api/accounts/:id` - Update an account (partial update)
- `DELETE /api/accounts/:id` - Delete an account
- `PATCH /api/accounts/:id/set-default` - Set account as default

### Voice (OpenAI Integration)
- `POST /api/voice/transactions` - Create a transaction from voice input
- `POST /api/voice/transactions/update` - Update an existing transaction from voice
- `POST /api/voice/transactions/update-pending` - Update a pending transaction from voice
- `POST /api/voice/categories` - Create a category from voice input
- `POST /api/voice/budgets` - Create or update a budget from voice input
- `POST /api/voice/accounts` - Create an account from voice input
- `GET /api/voice/consent` - Get voice consent status
- `POST /api/voice/consent` - Save voice consent

### Recurring Transactions
- `POST /api/transactions/:id/generate-recurring` - Generate recurring instances for an existing transaction

## Authentication

All API endpoints (except health check) require a Firebase JWT token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

## Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `FIREBASE_PROJECT_ID` | Plain text | Firebase project ID |
| `FIREBASE_API_KEY` | Secret | Firebase Web API Key |
| `OPENAI_API_KEY` | Secret | OpenAI API key for voice transcription and parsing |

## License

MIT
