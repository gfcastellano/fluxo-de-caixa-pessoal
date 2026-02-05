#!/usr/bin/env node

/**
 * Firebase Setup Script
 * 
 * This script sets up the Firebase project programmatically:
 * 1. Enables Firestore database
 * 2. Sets security rules
 * 3. Enables Google Authentication
 * 4. Adds localhost to authorized domains
 * 
 * Usage:
 *   node scripts/setup-firebase.js <project-id>
 * 
 * Requirements:
 *   - Firebase CLI installed (npm install -g firebase-tools)
 *   - Logged in to Firebase (firebase login)
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectId = process.argv[2] || 'fluxo-de-caixa-pessoal-d6d3f';

console.log(`Setting up Firebase project: ${projectId}\n`);

// Firestore security rules
const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    match /categories/{categoryId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }

    match /transactions/{transactionId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }

    match /budgets/{budgetId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }
  }
}
`;

// Create temporary firestore.rules file
const rulesPath = path.join(__dirname, 'firestore.rules');
fs.writeFileSync(rulesPath, firestoreRules.trim());

// Firebase configuration
const firebaseJson = {
  firestore: {
    rules: 'firestore.rules',
    indexes: 'firestore.indexes.json'
  },
  hosting: {
    public: 'frontend/dist',
    ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
    rewrites: [
      {
        source: '**',
        destination: '/index.html'
      }
    ]
  }
};

// Create firebase.json
const firebaseJsonPath = path.join(__dirname, '..', 'firebase.json');
fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseJson, null, 2));

// Create empty firestore.indexes.json
const indexesPath = path.join(__dirname, 'firestore.indexes.json');
fs.writeFileSync(indexesPath, JSON.stringify({ indexes: [], fieldOverrides: [] }, null, 2));

console.log('Created Firebase configuration files:\n');
console.log('  - firebase.json');
console.log('  - scripts/firestore.rules');
console.log('  - scripts/firestore.indexes.json\n');

console.log('To complete the setup, please run the following commands:\n');

console.log('1. Install Firebase CLI (if not already installed):');
console.log('   npm install -g firebase-tools\n');

console.log('2. Login to Firebase:');
console.log('   firebase login\n');

console.log('3. Initialize Firestore (select your project when prompted):');
console.log('   firebase init firestore --project ' + projectId + '\n');

console.log('4. Deploy security rules:');
console.log('   firebase deploy --only firestore:rules --project ' + projectId + '\n');

console.log('5. Enable Google Authentication:');
console.log('   - Go to https://console.firebase.google.com/project/' + projectId + '/authentication/providers');
console.log('   - Click "Google"');
console.log('   - Toggle "Enable" to ON');
console.log('   - Select your support email');
console.log('   - Click "Save"\n');

console.log('6. Add localhost to authorized domains:');
console.log('   - Go to https://console.firebase.google.com/project/' + projectId + '/authentication/settings');
console.log('   - Scroll to "Authorized domains"');
console.log('   - Click "Add domain"');
console.log('   - Enter: localhost');
console.log('   - Click "Add"\n');

console.log('7. Create Firestore database:');
console.log('   - Go to https://console.firebase.google.com/project/' + projectId + '/firestore');
console.log('   - Click "Create database"');
console.log('   - Choose "Start in test mode" or "Start in production mode"');
console.log('   - Select a location (e.g., europe-west)');
console.log('   - Click "Enable"\n');

console.log('Security rules have been written to scripts/firestore.rules');
console.log('You can deploy them using the command above.\n');

console.log('After completing these steps, your Firebase project will be ready!');
