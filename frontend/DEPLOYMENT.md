# Frontend Deployment Guide

This guide explains how to deploy the Fluxo de Caixa Pessoal frontend to Cloudflare Pages.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install with `npm install -g wrangler`
3. **Authenticated with Cloudflare**: Run `wrangler login`

## Environment Configuration

### Production Environment Variables

The file [`.env.production`](.env.production) contains production environment variables:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend API URL (Cloudflare Worker)
# Replace YOUR_ACCOUNT with your actual Cloudflare account name
# Example: VITE_API_URL=https://fluxo-de-caixa-backend.gabrielcastellano25.workers.dev
VITE_API_URL=https://fluxo-de-caixa-backend.YOUR_ACCOUNT.workers.dev
```

**How to find your Cloudflare account name:**

1. **After deploying the backend**, the terminal will show your Worker URL:
   ```
   https://fluxo-de-caixa-backend.<account-name>.workers.dev
   ```

2. **Extract the account name** from the URL:
   - Full URL: `https://fluxo-de-caixa-backend.gabrielcastellano25.workers.dev`
   - Account name: `gabrielcastellano25`

3. **Update the `.env.production` file**:
   ```bash
   VITE_API_URL=https://fluxo-de-caixa-backend.gabrielcastellano25.workers.dev
   ```

**Important Notes:**
- Do not include a trailing slash at the end of the URL
- Do not include `https://` twice
- The account name is case-sensitive
- If you have a custom domain, use that instead

## Building the Frontend

### Local Build (for testing)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```

The build output will be in the `dist/` directory.

### Preview Build Locally

```bash
npm run preview
```

## Deploying to Cloudflare Pages

### Option 1: Using Wrangler CLI (Recommended)

1. **Update the API URL** in [`.env.production`](.env.production):
   ```bash
   VITE_API_URL=https://fluxo-de-caixa-backend.YOUR_ACCOUNT.workers.dev
   ```
   Replace `YOUR_ACCOUNT` with your Cloudflare account name.

2. **Deploy**:
   ```bash
   npm run deploy
   ```

   This command:
   - Builds the project using Vite
   - Deploys the `dist/` folder to Cloudflare Pages

3. **First-time deployment**:
   - Wrangler will ask you to create a new project
   - Choose a project name (e.g., `fluxo-de-caixa-frontend`)
   - The deployment will complete and provide you with a URL

### Option 2: Using Cloudflare Dashboard

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Go to Cloudflare Dashboard**:
   - Navigate to "Pages" in the left sidebar
   - Click "Create a project"
   - Choose "Upload assets"

3. **Upload**:
   - Drag and drop the `dist/` folder
   - Set project name to `fluxo-de-caixa-frontend`
   - Deploy

### Option 3: Git Integration (Recommended for CI/CD)

1. **Push code to GitHub/GitLab**

2. **In Cloudflare Dashboard**:
   - Go to Pages → Create a project
   - Connect to Git
   - Select your repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
     - **Root directory**: `frontend`

3. **Set Environment Variables** in the dashboard:
   - Go to project settings → Environment variables
   - Add all variables from [`.env.production`](.env.production)

## Setting Environment Variables in Cloudflare Pages

### Via Dashboard

1. Go to your Pages project in Cloudflare Dashboard
2. Navigate to **Settings** → **Environment variables**
3. Add the following variables:

| Variable | Value |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyDEY0U9xweOtx6CDw_AKxjl7oegEQebLcQ` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `fluxo-de-caixa-pessoal-d6d3f.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `fluxo-de-caixa-pessoal-d6d3f` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `fluxo-de-caixa-pessoal-d6d3f.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `1006982255424` |
| `VITE_FIREBASE_APP_ID` | `1:1006982255424:web:abc123def456` |
| `VITE_API_URL` | `https://fluxo-de-caixa-backend.YOUR_ACCOUNT.workers.dev` |

### Via Wrangler CLI

```bash
wrangler pages project create fluxo-de-caixa-frontend

# Set environment variables
wrangler pages secret put VITE_FIREBASE_API_KEY --project=fluxo-de-caixa-frontend
# Enter: AIzaSyDEY0U9xweOtx6CDw_AKxjl7oegEQebLcQ

# Repeat for other secrets...
```

**Note**: For Vite environment variables to work in Cloudflare Pages, they need to be set as build environment variables, not secrets.

## Post-Deployment Configuration

### 1. Update Firebase Authorized Domains

After deployment, add your Cloudflare Pages domain to Firebase authorized domains:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your Cloudflare Pages domain (e.g., `fluxo-de-caixa-frontend.pages.dev`)

### 2. Update CORS on Backend

Ensure your Cloudflare Worker backend allows requests from your frontend domain. Update the CORS configuration in [`backend/src/index.ts`](backend/src/index.ts):

```typescript
const allowedOrigins = [
  'https://fluxo-de-caixa-frontend.pages.dev',
  'https://your-custom-domain.com', // if using custom domain
];
```

### 3. Custom Domain (Optional)

To use a custom domain:

1. In Cloudflare Dashboard, go to your Pages project
2. Navigate to **Custom domains**
3. Click **Set up a custom domain**
4. Follow the DNS configuration instructions

## Troubleshooting

### Build Failures

- **TypeScript errors**: Run `npm run build` locally to see detailed errors
- **Missing dependencies**: Delete `node_modules` and run `npm install`

### Runtime Errors

- **Firebase auth not working**: Check that the domain is added to Firebase authorized domains
- **API calls failing**: Verify `VITE_API_URL` is correct and backend is deployed
- **CORS errors**: Update backend CORS settings to allow the frontend domain

### Environment Variables Not Loading

- Ensure variables are prefixed with `VITE_` (required for Vite)
- For Cloudflare Pages, set variables in the dashboard under Build settings
- Redeploy after changing environment variables

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Build and deploy to Cloudflare Pages |

## Project Structure

```
frontend/
├── .env.production      # Production environment variables
├── DEPLOYMENT.md        # This file
├── dist/                # Build output (generated)
├── index.html           # Entry HTML file
├── package.json         # Dependencies and scripts
├── src/                 # Source code
│   ├── firebase/        # Firebase configuration
│   ├── services/        # API services
│   └── ...
└── vite.config.ts       # Vite configuration
```

## Security Notes

- Firebase API keys are safe to expose in frontend code (they are restricted by domain)
- Never commit sensitive API keys or secrets to version control
- Use Cloudflare Pages environment variables for any sensitive configuration
- Ensure Firebase security rules are properly configured

## Support

For issues related to:
- **Frontend**: Check browser console for errors
- **Backend API**: See [`backend/DEPLOYMENT.md`](backend/DEPLOYMENT.md)
- **Firebase**: Check Firebase Console logs
