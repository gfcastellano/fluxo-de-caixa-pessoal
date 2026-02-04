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
│   │   ├── components/   # UI Components
│   │   ├── pages/        # Page Components
│   │   ├── services/     # Firebase Services
│   │   ├── context/      # React Context
│   │   ├── types/        # TypeScript Types
│   │   └── utils/        # Utilities
│   ├── package.json
│   └── README.md
├── backend/               # Cloudflare Workers API
│   ├── src/
│   │   ├── routes/       # API Routes
│   │   ├── services/     # Business Logic
│   │   ├── middleware/   # Auth Middleware
│   │   └── types/        # TypeScript Types
│   ├── package.json
│   └── README.md
├── plans/                 # Project Documentation
│   ├── architecture.md
│   └── todo.md
└── README.md
```

## Features

### Core Features
- ✅ User Authentication (Email/Password)
- ✅ Transaction Management (Income/Expense tracking)
- ✅ Category Management (Custom categories with colors)
- ✅ Budget Management (Set and track budgets)
- ✅ Monthly Reports & Analytics
- ✅ Data Visualization (Charts)
- ✅ Voice Transaction Input (OpenAI Whisper + GPT)
- ✅ Multi-language Support (EN, ES, PT)
- ✅ Responsive Design

### Frontend Features
- Modern React with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- React Router for navigation
- Firebase SDK for Auth and Firestore
- Protected routes
- Responsive sidebar layout

### Backend Features
- RESTful API with Hono
- JWT Authentication middleware
- CRUD operations for all entities
- Reporting endpoints
- CORS enabled
- Firebase Firestore integration

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
- [Architecture Document](plans/architecture.md) - Detailed technical architecture
- [Voice Transaction Feature](plans/voice-transaction-feature.md) - Voice input implementation
- [Frontend README](frontend/README.md) - Frontend-specific documentation
- [Backend README](backend/README.md) - Backend-specific documentation
- [Firebase Setup Guide](FIREBASE_SETUP_GUIDE.md) - Firebase configuration

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
