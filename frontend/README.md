# Fluxo de Caixa Pessoal - Frontend

Personal Cash Flow Management Application built with React, TypeScript, Firebase, and Tailwind CSS.

## Features

- **Authentication**: Email/password authentication using Firebase Auth
- **Transaction Management**: Track income and expenses with categories
- **Category Management**: Create custom categories with colors for income and expenses
- **Budget Management**: Set budgets and track spending against them
- **Reports & Analytics**: Visualize spending with charts and monthly summaries
- **Responsive Design**: Works on desktop and mobile devices

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
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Layout.tsx
│   └── ProtectedRoute.tsx
├── context/          # React context providers
│   └── AuthContext.tsx
├── firebase/         # Firebase configuration
│   └── config.ts
├── pages/            # Page components
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   ├── Categories.tsx
│   ├── Budgets.tsx
│   └── Reports.tsx
├── services/         # API service functions
│   ├── categoryService.ts
│   ├── transactionService.ts
│   ├── budgetService.ts
│   └── reportService.ts
├── types/            # TypeScript type definitions
│   └── index.ts
├── utils/            # Utility functions
│   ├── cn.ts
│   └── format.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Deployment

This app is configured for deployment on Cloudflare Pages:

1. Build the app: `npm run build`
2. Deploy the `dist` folder to Cloudflare Pages
3. Configure environment variables in Cloudflare Pages dashboard

## License

MIT
