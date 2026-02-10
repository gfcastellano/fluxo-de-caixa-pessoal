# Fluxo de Caixa Pessoal - Frontend

Personal Cash Flow Management Application built with React, TypeScript, Firebase, and Tailwind CSS.

## Features

- **Authentication**: Google OAuth authentication using Firebase Auth
- **Account Management**: Multiple accounts with different currencies (BRL, USD, EUR, etc.)
- **Transaction Management**: Track income, expenses, and transfers with categories
- **Recurring Transactions**: Create recurring transactions with installment tracking (monthly, weekly, yearly)
- **Bulk Edit**: Edit single, forward, or all instances of recurring transactions
- **Category Management**: Create custom categories with colors and icons
- **Budget Management**: Set monthly or yearly budgets and track spending
- **Reports & Analytics**: Visualize spending with charts, trends, and monthly summaries
- **Voice Input**: Create and update transactions using voice commands (OpenAI Whisper + GPT-4)
- **Multi-language**: Support for English, Spanish, and Portuguese
- **Responsive Design**: Works on desktop and mobile devices with mobile dock navigation
- **Privacy Controls**: Voice consent management and data deletion options
- **Default Categories**: Automatic creation of common categories on first login
- **Cash Accounts**: Automatic cash account creation for each currency used
- **Default Account**: Set a default account for quick transaction creation

## Voice Feature

The app supports voice commands for hands-free operation:

- **Create transactions**: "Spent 50 dollars on Food at Nubank today"
- **Create categories**: "Create category Food of type expense with green color"
- **Create accounts**: "Create Nubank account with initial balance of 1000 dollars"
- **Create budgets**: "Create budget of 500 dollars for Food monthly"
- **Update transactions**: "Change the amount to 75 dollars"

See [Voice Feature Documentation](../plans/voice-feature-documentation.md) for detailed information.

## Internationalization (i18n)

The app supports multiple languages:

- **English** (en) - Default
- **Portuguese** (pt) - Português
- **Spanish** (es) - Español

Language is automatically detected from browser settings and can be changed in Settings.

### Adding a New Language

1. Create a new file in `src/i18n/locales/` (e.g., `fr.ts` for French)
2. Copy the structure from `en.ts` and translate all strings
3. Add the language to `src/i18n/index.ts`:

```typescript
import { frTranslations } from './locales/fr';

const resources = {
  en: { translation: enTranslations },
  pt: { translation: ptTranslations },
  es: { translation: esTranslations },
  fr: { translation: frTranslations }, // Add here
};
```

4. Add the language option in `src/pages/Settings.tsx`:

```typescript
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }, // Add here
];
```

5. Test the new language by changing it in Settings

## Available Scripts

- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to Cloudflare Pages (requires Wrangler CLI)

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project (create one at [firebase.google.com](https://firebase.google.com))

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values from your Firebase Console

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Firebase Setup

1. Create a new Firebase project
2. Enable Authentication (Email/Password provider)
3. Create a Firestore database
4. Add a web app to your Firebase project
5. Copy the configuration values to your `.env` file

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /categories/{categoryId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /budgets/{budgetId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Button.tsx           # Button component with variants
│   ├── Card.tsx             # Card container component
│   ├── Input.tsx            # Form input component
│   ├── Layout.tsx           # Main app layout with sidebar
│   ├── ProtectedRoute.tsx   # Auth guard for private routes
│   ├── BaseModal.tsx        # Base modal component
│   ├── TransactionModal.tsx # Transaction create/edit modal
│   ├── CategoryModal.tsx    # Category create/edit modal
│   ├── BudgetModal.tsx      # Budget create/edit modal
│   ├── AccountModal.tsx     # Account create/edit modal
│   ├── VoiceDock.tsx        # Mobile navigation dock with voice
│   ├── VoiceHeroButton.tsx  # Voice recording button
│   ├── VoiceConsentModal.tsx # Voice privacy consent modal
│   ├── AudioWaveform.tsx    # Audio visualization component
│   ├── PageDescription.tsx  # Page help/info component
│   ├── ColorPicker.tsx      # Color selection component
│   ├── UserDropdown.tsx     # User menu dropdown
│   └── LogoutConfirmModal.tsx # Logout confirmation modal
├── context/          # React context providers
│   ├── AuthContext.tsx      # Authentication state
│   └── VoiceContext.tsx     # Voice feature state
├── firebase/         # Firebase configuration
│   └── config.ts
├── hooks/            # Custom React hooks
│   ├── useVoiceRecorder.ts  # Audio recording hook
│   ├── useVoiceForm.ts      # Voice form integration hook
│   ├── usePageModal.ts      # Page modal state management
│   ├── useScrollDirection.ts # Scroll detection hook
│   ├── useUserSetup.ts      # User initialization hook
│   └── useDefaultCategories.ts # Default categories setup
├── i18n/             # Internationalization
│   ├── index.ts             # i18n configuration
│   └── locales/             # Translation files
│       ├── en.ts            # English
│       ├── pt.ts            # Portuguese
│       └── es.ts            # Spanish
├── pages/            # Page components
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   ├── Categories.tsx
│   ├── Budgets.tsx
│   ├── Reports.tsx
│   ├── Accounts.tsx         # Account management page
│   ├── Settings.tsx         # App settings page
│   ├── PrivacyPolicy.tsx    # Privacy policy page
│   └── TermsOfService.tsx   # Terms of service page
├── services/         # API service functions
│   ├── categoryService.ts
│   ├── transactionService.ts
│   ├── budgetService.ts
│   ├── reportService.ts
│   ├── accountService.ts    # Account CRUD operations
│   └── voiceService.ts      # Voice API integration
├── styles/           # Styling and design system
│   ├── design-system.ts     # Color palette, spacing, etc.
│   └── utilities.ts         # CSS utilities
├── types/            # TypeScript type definitions
│   └── index.ts
├── utils/            # Utility functions
│   ├── cn.ts                # Class name utilities (clsx + tailwind-merge)
│   ├── format.ts            # Date and number formatting
│   └── categoryTranslations.ts # Category name translations
├── App.tsx
├── main.tsx
└── index.css
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env` file in the frontend directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Required variables:

| Variable | Description | Source |
|----------|-------------|--------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | Firebase Console → Project Settings |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Firebase Console → Project Settings |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console → Project Settings |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | Firebase Console → Project Settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging ID | Firebase Console → Project Settings |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Firebase Console → Project Settings |
| `VITE_API_URL` | Backend API URL | Your Cloudflare Worker URL |

## Deployment

This app is configured for deployment on Cloudflare Pages.

### Prerequisites

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

### Deploy

1. Update `.env.production` with your backend URL:
```env
VITE_API_URL=https://fluxo-de-caixa-backend.YOUR_ACCOUNT.workers.dev
```

2. Deploy:
```bash
npm run deploy
```

This will build the app and deploy to Cloudflare Pages.

### Alternative: Manual Upload

1. Build the app:
```bash
npm run build
```

2. Go to Cloudflare Dashboard → Pages
3. Create a new project
4. Upload the `dist` folder

## Development Tips

### Adding a New Page

1. Create the page component in `src/pages/`
2. Add the route in `App.tsx`
3. Add navigation item in `src/components/Layout.tsx` (desktop) and `src/components/VoiceDock.tsx` (mobile)
4. Add translations in `src/i18n/locales/*.ts`
5. Add page description in `src/i18n/locales/*.ts` under `pageDescriptions`

### Adding a New Service

1. Create the service file in `src/services/`
2. Export functions for CRUD operations
3. Use Firebase Auth token for API calls
4. Add error handling and logging

### Working with Voice

1. Add voice hints in `src/i18n/locales/*.ts` under `voice.*Hint`
2. Update `VoiceContext.tsx` if adding new entity types
3. Add backend parsing in `backend/src/services/openai.ts`

## Troubleshooting

**"Firebase: Error (auth/invalid-api-key)"**
- Check your `.env` file values
- Ensure the `.env` file is in the `frontend` folder
- Restart the dev server after changing `.env`

**"Firebase: Error (auth/unauthorized-domain)"**
- Add `localhost` to authorized domains in Firebase Console
- For production, add your Cloudflare Pages domain

**"Cannot connect to backend"**
- Verify `VITE_API_URL` is set correctly
- Check backend is running (local or deployed)
- Check CORS configuration in backend

**"Voice recording not working"**
- Ensure HTTPS (required for microphone access)
- Check browser permissions for microphone
- Try a different browser (Chrome recommended)

## License

MIT

## Contributing

When adding new features, please:
1. Update this README with relevant documentation
2. Add translations for all supported languages
3. Update the project structure diagram if adding new directories
4. Add voice support hints if applicable
5. Test on both desktop and mobile devices
