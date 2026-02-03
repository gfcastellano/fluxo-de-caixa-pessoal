# Deployment Guide - Fluxo de Caixa Pessoal

> **Start here!** This guide provides the complete deployment workflow. For detailed instructions on specific components, refer to:
> - [Backend Deployment Guide](backend/DEPLOYMENT.md) - Cloudflare Workers specific instructions
> - [Frontend Deployment Guide](frontend/DEPLOYMENT.md) - Cloudflare Pages specific instructions
> - [Firebase Setup Guide](FIREBASE_SETUP_GUIDE.md) - Firebase project configuration

---

## Overview

Fluxo de Caixa Pessoal uses a modern serverless architecture:

| Component | Platform | Purpose |
|-----------|----------|---------|
| **Frontend** | Cloudflare Pages | React + Vite SPA hosting |
| **Backend** | Cloudflare Workers | Hono.js API server |
| **Database** | Firebase Firestore | NoSQL data storage |
| **Authentication** | Firebase Auth | Google OAuth |
| **AI Processing** | OpenAI API | Voice-to-transaction parsing |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Cloudflare Pages (Frontend)                │   │
│  │         React + Vite + Tailwind CSS + Firebase Auth     │   │
│  └────────────────────┬────────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Cloudflare Workers                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Backend API (Hono.js)                │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐  │   │
│  │  │/api/    │ │/api/    │ │/api/    │ │/api/voice    │  │   │
│  │  │categories│ │transactions│ │budgets  │ │(OpenAI)      │  │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └──────┬───────┘  │   │
│  └───────┼───────────┼───────────┼─────────────┼──────────┘   │
└──────────┼───────────┼───────────┼─────────────┼───────────────┘
           │           │           │             │
           └───────────┴───────────┴─────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│ Firebase        │ │ Firebase     │ │ OpenAI API   │
│ Firestore       │ │ Auth         │ │ (Voice)      │
│ (Database)      │ │ (OAuth)      │ │              │
└─────────────────┘ └──────────────┘ └──────────────┘
```

---

## Prerequisites

Before starting deployment, ensure you have:

1. **Cloudflare Account**
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Verify your email

2. **Wrangler CLI Installed & Authenticated**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. **Firebase Project Created**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Google Authentication
   - Set up Firestore Database
   - See [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md) for detailed steps

4. **OpenAI API Key** (for voice features)
   - Get from [platform.openai.com](https://platform.openai.com/api-keys)

---

## Deployment Order

**Important:** Deploy in this exact order to avoid configuration issues.

### Step 1: Deploy Backend (Cloudflare Workers)

Navigate to the backend directory and deploy:

```bash
cd backend
npm install
npm run deploy
```

After deployment, note your Worker URL:
```
https://fluxo-de-caixa-backend.<your-account>.workers.dev
```

**Reference:** See [backend/DEPLOYMENT.md](backend/DEPLOYMENT.md) for detailed backend configuration.

---

### Step 2: Configure Backend Secrets

Set the required secrets for your Worker:

```bash
# In the backend directory
wrangler secret put FIREBASE_API_KEY
# Enter your Firebase Web API Key

wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key
```

Verify secrets are set:
```bash
wrangler secret list
```

---

### Step 3: Update Frontend Environment with Backend URL

Edit [`frontend/.env.production`](frontend/.env.production) and update the API URL:

```bash
# Replace YOUR_ACCOUNT with your actual Cloudflare account name
VITE_API_URL=https://fluxo-de-caixa-backend.YOUR_ACCOUNT.workers.dev
```

---

### Step 4: Deploy Frontend (Cloudflare Pages)

Navigate to the frontend directory and deploy:

```bash
cd frontend
npm install
npm run deploy
```

First-time deployment will prompt you to create a new project:
- Choose a project name (e.g., `fluxo-de-caixa-frontend`)
- The deployment will complete and provide you with a URL

**Reference:** See [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md) for alternative deployment methods.

---

### Step 5: Configure Firebase Authentication

After the frontend is deployed, add your domain to Firebase authorized domains:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your Cloudflare Pages domain:
   ```
   fluxo-de-caixa-frontend.pages.dev
   ```
5. If using a custom domain, add that as well

---

### Step 6: Update Backend CORS

Update the backend CORS configuration to allow requests from your frontend domain:

Edit [`backend/src/index.ts`](backend/src/index.ts) and update the CORS origin:

```typescript
app.use(
  '*',
  cors({
    origin: [
      'https://fluxo-de-caixa-frontend.pages.dev',
      // Add your custom domain if applicable
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);
```

Then redeploy the backend:
```bash
cd backend
npm run deploy
```

---

## Quick Start Commands

Condensed version for experienced users:

```bash
# === PREREQUISITES ===
npm install -g wrangler
wrangler login

# === STEP 1: DEPLOY BACKEND ===
cd backend
npm install
npm run deploy
# Note the deployed URL: https://fluxo-de-caixa-backend.<account>.workers.dev

# === STEP 2: SET BACKEND SECRETS ===
wrangler secret put FIREBASE_API_KEY
wrangler secret put OPENAI_API_KEY

# === STEP 3: UPDATE FRONTEND ENV ===
# Edit frontend/.env.production
# VITE_API_URL=https://fluxo-de-caixa-backend.<account>.workers.dev

# === STEP 4: DEPLOY FRONTEND ===
cd ../frontend
npm install
npm run deploy

# === STEP 5: CONFIGURE FIREBASE ===
# Go to Firebase Console → Authentication → Settings → Authorized domains
# Add: fluxo-de-caixa-frontend.pages.dev

# === STEP 6: UPDATE CORS ===
# Edit backend/src/index.ts with your frontend domain
cd ../backend
npm run deploy
```

---

## Post-Deployment Checklist

Verify everything is working correctly:

### Backend Verification

- [ ] Worker is accessible at `https://fluxo-de-caixa-backend.<account>.workers.dev`
- [ ] Health check returns success:
  ```bash
  curl https://fluxo-de-caixa-backend.<account>.workers.dev/
  ```
- [ ] Secrets are configured:
  ```bash
  wrangler secret list
  ```

### Frontend Verification

- [ ] Site loads without errors at your Pages URL
- [ ] Firebase authentication works (try logging in with Google)
- [ ] API calls succeed (check browser Network tab)
- [ ] No CORS errors in browser console

### Full Integration Test

- [ ] Create a test transaction
- [ ] Verify data appears in Firestore
- [ ] Test voice transaction feature (if OpenAI key is set)
- [ ] Check that reports load correctly

---

## Troubleshooting

### Common Issues and Solutions

#### Backend Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `Secret not found` | Secrets not set | Run `wrangler secret put <NAME>` for each secret |
| `Failed to fetch` from frontend | CORS not configured | Update CORS origin in `backend/src/index.ts` |
| `Firebase auth failed` | Wrong API key | Verify `FIREBASE_API_KEY` secret value |

#### Frontend Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `404` on page refresh | SPA routing | Ensure `_redirects` file is in `dist/` folder |
| Blank page | Build error | Check `npm run build` output for errors |
| Firebase auth popup blocked | Domain not authorized | Add Pages domain to Firebase authorized domains |
| API calls failing | Wrong API URL | Verify `VITE_API_URL` in `.env.production` |

#### CORS Errors

If you see CORS errors in the browser console:

1. Check backend CORS configuration in [`backend/src/index.ts`](backend/src/index.ts)
2. Ensure the frontend domain is in the allowed origins list
3. Redeploy the backend after making changes

#### Environment Variables Not Loading

- Ensure variables in `.env.production` are prefixed with `VITE_`
- For Cloudflare Pages dashboard deployment, set variables in Build settings
- Redeploy after changing environment variables

### Getting Help

If issues persist:

1. Check the detailed guides:
   - [Backend Deployment Guide](backend/DEPLOYMENT.md)
   - [Frontend Deployment Guide](frontend/DEPLOYMENT.md)
   - [Firebase Setup Guide](FIREBASE_SETUP_GUIDE.md)

2. Check Cloudflare Workers logs:
   ```bash
   cd backend
   wrangler tail
   ```

3. Verify Firestore rules are properly configured

4. Check browser console for detailed error messages

---

## Environment Variables Reference

### Backend Secrets (Wrangler)

| Secret | Description | Source |
|--------|-------------|--------|
| `FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console → Project Settings |
| `OPENAI_API_KEY` | OpenAI API key | platform.openai.com/api-keys |

### Backend Variables (wrangler.toml)

| Variable | Value |
|----------|-------|
| `FIREBASE_PROJECT_ID` | `fluxo-de-caixa-pessoal-d6d3f` |

### Frontend Variables (.env.production)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_API_URL` | Backend Worker URL |

---

## Next Steps

After successful deployment:

1. **Set up custom domain** (optional) - See [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md#custom-domain-optional)
2. **Configure CI/CD** - Connect Git repository for automatic deployments
3. **Monitor usage** - Check Cloudflare and Firebase dashboards
4. **Set up alerts** - Configure monitoring for errors and performance

---

## Project Structure

```
fluxo-de-caixa-pessoal/
├── backend/                 # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts        # Main entry point
│   │   ├── routes/         # API routes
│   │   ├── services/       # Firebase & OpenAI services
│   │   └── middleware/     # Auth middleware
│   ├── wrangler.toml       # Worker configuration
│   └── DEPLOYMENT.md       # Backend deployment guide
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/          # React pages
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── firebase/       # Firebase config
│   ├── .env.production     # Production env vars
│   └── DEPLOYMENT.md       # Frontend deployment guide
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
├── FIREBASE_SETUP_GUIDE.md # Firebase setup instructions
└── DEPLOYMENT.md           # This file
```
