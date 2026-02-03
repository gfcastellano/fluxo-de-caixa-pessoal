# Firebase Setup Guide for Fluxo de Caixa Pessoal

This guide will walk you through creating a Firebase project and enabling Google Authentication.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Sign in with your Google account
3. Click "Add project" or "Create a project"
4. Enter a project name (e.g., "fluxo-de-caixa-pessoal")
5. Choose whether to enable Google Analytics (optional)
6. Accept the terms and click "Create project"
7. Wait for the project to be created, then click "Continue"

## Step 2: Register a Web App

1. In the Firebase console, click the web icon (</>) to add a web app
2. Give your app a nickname (e.g., "Fluxo de Caixa Web")
3. **Important**: Check the box for "Also set up Firebase Hosting for this app" if you want to use Firebase Hosting later
4. Click "Register app"
5. Firebase will display your app's configuration - **copy these values**, you'll need them!

Your config will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## Step 3: Enable Google Authentication

1. In the left sidebar, click "Authentication"
2. Click "Get started"
3. Click "Google" in the "Sign-in method" tab
4. Toggle "Enable" to ON
5. Select your support email from the dropdown
6. Click "Save"

## Step 4: Create Firestore Database

1. In the left sidebar, click "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" or "Start in test mode"
   - **Production mode**: Requires security rules (recommended for production)
   - **Test mode**: Allows all reads/writes for 30 days (good for development)
4. Select a location close to your users (e.g., "europe-west" for Europe)
5. Click "Enable"

## Step 5: Set Up Security Rules

1. Go to Firestore Database → Rules tab
2. Replace the default rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Categories collection
    match /categories/{categoryId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }

    // Transactions collection
    match /transactions/{transactionId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }

    // Budgets collection
    match /budgets/{budgetId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }
  }
}
```

3. Click "Publish"

## Step 6: Configure Authorized Domains (Important!)

For Google Sign-In to work, you need to add your domain to the authorized domains list:

1. In Firebase Console, go to Authentication → Settings → Authorized domains
2. Click "Add domain"
3. Add `localhost` (for local development)
4. If deploying, add your production domain (e.g., `your-app.pages.dev` for Cloudflare Pages)

## Step 7: Create the Environment File

1. In the `frontend` folder, create a file named `.env`
2. Copy the values from your Firebase config into this format:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

**Example:**
```env
VITE_FIREBASE_API_KEY=AIzaSyB1234567890abcdefg
VITE_FIREBASE_AUTH_DOMAIN=fluxo-de-caixa-pessoal.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fluxo-de-caixa-pessoal
VITE_FIREBASE_STORAGE_BUCKET=fluxo-de-caixa-pessoal.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

## Step 8: Run the Application

Now you can run the frontend:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser and you should see the login page with a "Sign in with Google" button!

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Double-check your `.env` file values
- Make sure the `.env` file is in the `frontend` folder
- Restart the dev server after changing `.env`

### "Firebase: Error (auth/unauthorized-domain)"
- Go to Firebase Console → Authentication → Settings → Authorized domains
- Add `localhost` to the list
- If deploying, add your production domain

### "Permission denied" errors
- Check that Firestore security rules are published
- Verify the user is authenticated
- Ensure the `userId` field matches the authenticated user's UID

### Popup blocked by browser
- Make sure to allow popups for localhost in your browser settings
- The Google sign-in opens in a popup window

## Next Steps

1. Click "Sign in with Google" on the login page
2. Select your Google account
3. You'll be redirected to the Dashboard
4. Add some categories (e.g., "Food", "Transport", "Salary")
5. Add your first transactions
6. Set up budgets to track your spending
7. View reports to see your financial overview

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth Web Setup](https://firebase.google.com/docs/auth/web/start)
- [Google Sign-In with Firebase](https://firebase.google.com/docs/auth/web/google-signin)
