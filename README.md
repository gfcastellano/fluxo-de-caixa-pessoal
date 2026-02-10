# Fluxo de Caixa Pessoal

Personal Cash Flow Management Application - A full-stack web application for tracking personal finances.

## Overview

**Fluxo de Caixa Pessoal** is a comprehensive personal finance management application that helps users track income and expenses, manage budgets, and visualize financial data through reports and charts.

## Architecture

This project follows a modern web architecture:

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Cloudflare Workers + Hono + TypeScript
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Hosting**: Cloudflare Pages (Frontend) + Cloudflare Workers (Backend)

## Project Structure

```
fluxo-de-caixa-pessoal/
├── frontend/              # React Application
│   ├── src/
│   │   ├── components/   # UI Components (modals, buttons, cards, etc.)
│   │   ├── pages/        # Page Components (Dashboard, Transactions, etc.)
│   │   ├── services/     # API Services (Firebase, Backend API)
│   │   ├── context/      # React Context (Auth, Voice)
│   │   ├── hooks/        # Custom React Hooks
│   │   ├── i18n/         # Internationalization (EN, ES, PT)
│   │   ├── styles/       # Design system and utilities
│   │   ├── types/        # TypeScript Types
│   │   └── utils/        # Utility functions
│   ├── .env.example      # Environment variables template
│   ├── package.json
│   └── README.md
├── backend/               # Cloudflare Workers API
│   ├── src/
│   │   ├── routes/       # API Routes (categories, transactions, etc.)
│   │   ├── services/     # Business Logic (Firebase, OpenAI)
│   │   ├── middleware/   # Auth Middleware
│   │   ├── i18n/         # Voice translations (EN, ES, PT)
│   │   └── types/        # TypeScript Types
│   ├── package.json
│   └── README.md
├── plans/                 # Project Documentation & Plans
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── recurring-transactions-fix.md
│   ├── recurring-transactions-validation.md
│   ├── recurring-edit-modes.md
│   ├── recurring-grouping-refactor.md
│   └── negative-balance-chart-indicator.md
├── scripts/               # Utility scripts
└── README.md
```

## Features

### Core Features
- ✅ User Authentication (Google OAuth via Firebase Auth)
- ✅ Account Management (Multiple accounts with different currencies)
- ✅ Transaction Management (Income/Expense/Transfer tracking)
- ✅ Recurring Transactions (Monthly, weekly, yearly with installment tracking)
- ✅ Bulk Edit for Recurring Transactions (Single, forward, or all instances)
- ✅ Category Management (Custom categories with colors and icons)
- ✅ Budget Management (Set and track budgets by category)
- ✅ Monthly Reports & Analytics
- ✅ Data Visualization (Charts with trend analysis)
- ✅ Voice Transaction Input (OpenAI Whisper + GPT-4)
- ✅ Multi-language Support (English, Spanish, Portuguese)
- ✅ Responsive Design (Mobile-friendly)
- ✅ Privacy Controls (Voice consent management, data deletion)

### Frontend Features
- Modern React 18 with TypeScript
- Tailwind CSS for styling with custom design system
- Recharts for data visualization
- React Router v6 for navigation
- Firebase SDK for Auth and Firestore
- Protected routes with authentication guards
- Responsive sidebar layout with mobile dock navigation
- Voice recording with audio waveform visualization
- i18n with react-i18next (English, Spanish, Portuguese)
- Custom hooks for voice recording, scroll direction, and page modals
- Component library with modals, cards, buttons, and inputs

### Backend Features
- RESTful API with Hono framework
- JWT Authentication middleware (Firebase Auth)
- CRUD operations for all entities (Categories, Transactions, Budgets, Accounts)
- Recurring transaction generation and management
- Voice processing endpoints (OpenAI Whisper + GPT-4)
- Reporting endpoints (monthly summary, category breakdown)
- CORS enabled for frontend communication
- Firebase Firestore integration via REST API
- Multi-language voice response support (EN, ES, PT)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase account
- Cloudflare account (for backend deployment)

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file with Firebase config
cp .env.example .env
# Edit .env with your Firebase credentials

npm run dev
```

### Backend Setup

```bash
cd backend
npm install

# Configure wrangler.toml with Firebase credentials

npm run dev
```

## Environment Variables

### Frontend (.env)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Backend

**Environment Variables (wrangler.toml):**
```toml
[vars]
FIREBASE_PROJECT_ID = "your-project-id"
```

**Secrets (set via Wrangler CLI):**
```bash
wrangler secret put FIREBASE_API_KEY
wrangler secret put OPENAI_API_KEY
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.

### Quick Deploy

**Backend (Cloudflare Workers):**
```bash
cd backend
npm install
wrangler secret put FIREBASE_API_KEY
wrangler secret put OPENAI_API_KEY
npm run deploy
```

**Frontend (Cloudflare Pages):**
```bash
cd frontend
npm install
npm run deploy
```

### Live URLs
- **Frontend:** https://fluxo-de-caixa-frontend.pages.dev
- **Backend:** https://fluxo-de-caixa-backend.gabrielcastellano25.workers.dev

## Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [Frontend Deployment](frontend/DEPLOYMENT.md) - Cloudflare Pages deployment
- [Backend Deployment](backend/DEPLOYMENT.md) - Cloudflare Workers deployment
- [Frontend README](frontend/README.md) - Frontend-specific documentation
- [Backend README](backend/README.md) - Backend-specific documentation
- [Firebase Setup Guide](FIREBASE_SETUP_GUIDE.md) - Firebase project configuration
- [Implementation Summary](plans/IMPLEMENTATION_SUMMARY.md) - Recent feature implementations
- [Voice Feature](plans/recurring-transactions-fix.md) - Recurring transactions documentation

## Pages

| Page | Description | Voice Support |
|------|-------------|---------------|
| **Dashboard** | Financial overview with summary cards and recent transactions | ✅ |
| **Transactions** | Manage income, expenses, and transfers with recurring support | ✅ |
| **Categories** | Organize transactions with custom categories | ✅ |
| **Budgets** | Set and track spending limits by category | ✅ |
| **Accounts** | Manage multiple accounts with different currencies | ✅ |
| **Reports** | Visual analytics with charts and trend analysis | ❌ |
| **Settings** | Language, voice consent, and data management | - |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Cloudflare Workers, Hono, TypeScript |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Charts | Recharts |
| Icons | Lucide React |
| Validation | Zod |
| Voice AI | OpenAI Whisper + GPT-4 |
| i18n | react-i18next |

## License

MIT
