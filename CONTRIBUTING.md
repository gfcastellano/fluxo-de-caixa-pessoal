# Contributing Guide

Thank you for your interest in contributing to Fluxo de Caixa Pessoal! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Internationalization (i18n)](#internationalization-i18n)
- [Adding New Features](#adding-new-features)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A Firebase account
- A Cloudflare account (for backend deployment)

### Setup

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/your-username/fluxo-de-caixa-pessoal.git
cd fluxo-de-caixa-pessoal
```

3. Install dependencies:
```bash
cd frontend && npm install
cd ../backend && npm install
```

4. Set up environment variables (see [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md))

5. Start development servers:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow conventional commits:
```
feat: add new voice command for budget creation
fix: resolve transaction date parsing issue
docs: update API endpoint documentation
refactor: simplify recurring transaction logic
```

## Internationalization (i18n)

The application supports multiple languages. When adding new features, ensure all user-facing text is translatable.

### Supported Languages

- **English** (en) - Default
- **Portuguese** (pt) - Português
- **Spanish** (es) - Español

### Adding Translations

Translation files are located in:
- `frontend/src/i18n/locales/en.ts`
- `frontend/src/i18n/locales/pt.ts`
- `frontend/src/i18n/locales/es.ts`

#### Adding a New Translation Key

1. Add the key to all translation files:

```typescript
// frontend/src/i18n/locales/en.ts
export const enTranslations = {
  // ... existing translations
  myNewFeature: {
    title: 'My New Feature',
    description: 'Description of my new feature',
    buttonLabel: 'Click Me',
  },
};
```

```typescript
// frontend/src/i18n/locales/pt.ts
export const ptTranslations = {
  // ... existing translations
  myNewFeature: {
    title: 'Minha Nova Funcionalidade',
    description: 'Descrição da minha nova funcionalidade',
    buttonLabel: 'Clique Aqui',
  },
};
```

```typescript
// frontend/src/i18n/locales/es.ts
export const esTranslations = {
  // ... existing translations
  myNewFeature: {
    title: 'Mi Nueva Funcionalidad',
    description: 'Descripción de mi nueva funcionalidad',
    buttonLabel: 'Haz Clic Aquí',
  },
};
```

2. Use the translation in your component:

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('myNewFeature.title')}</h1>
      <p>{t('myNewFeature.description')}</p>
      <button>{t('myNewFeature.buttonLabel')}</button>
    </div>
  );
}
```

### Translation Best Practices

1. **Always add to all languages** - Never leave a translation key empty in any language file
2. **Use nested keys** - Group related translations (e.g., `transactions.form.title`)
3. **Keep keys descriptive** - Use clear, descriptive names
4. **Reuse existing keys** - Don't create duplicate translations
5. **Consider context** - Some words have different meanings in different contexts

### Adding a New Language

To add support for a new language (e.g., French):

1. Create a new translation file:
```bash
touch frontend/src/i18n/locales/fr.ts
```

2. Copy the structure from `en.ts` and translate all strings

3. Register the language in `frontend/src/i18n/index.ts`:
```typescript
import { frTranslations } from './locales/fr';

const resources = {
  en: { translation: enTranslations },
  pt: { translation: ptTranslations },
  es: { translation: esTranslations },
  fr: { translation: frTranslations },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'pt', 'es', 'fr'], // Add here
  // ...
});
```

4. Add the language option in Settings:
```typescript
// frontend/src/pages/Settings.tsx
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];
```

5. Add backend voice translations (if using voice features):
```typescript
// backend/src/i18n/voice-translations.ts
export const voiceTranslations: Record<string, VoiceTranslations> = {
  en: { /* ... */ },
  pt: { /* ... */ },
  es: { /* ... */ },
  fr: {
    errors: { /* ... */ },
    success: { /* ... */ },
    defaults: { /* ... */ },
  },
};
```

## Adding New Features

### Adding a New Page

1. Create the page component in `frontend/src/pages/MyPage.tsx`
2. Add the route in `frontend/src/App.tsx`
3. Add navigation in:
   - `frontend/src/components/Layout.tsx` (desktop sidebar)
   - `frontend/src/components/VoiceDock.tsx` (mobile dock)
4. Add translations for the page
5. Add page description in translations under `pageDescriptions`
6. Update relevant documentation

### Adding Voice Support

If your feature should support voice commands:

1. Add voice hints in translations:
```typescript
voice: {
  myFeatureHint: 'Say something like: "Create a budget of 500 dollars for Food"',
}
```

2. Update `VoiceContext.tsx` to handle the new entity type
3. Add backend parsing in `backend/src/services/openai.ts`
4. Add API endpoint in `backend/src/routes/voice.ts`
5. Document the voice commands in the feature documentation

### Adding a New API Endpoint

1. Create or update the route file in `backend/src/routes/`
2. Add the route to `backend/src/index.ts`
3. Update `backend/README.md` with the new endpoint
4. Create the corresponding service function in `frontend/src/services/`
5. Add TypeScript types in `frontend/src/types/index.ts` and `backend/src/types/index.ts`

## Testing

### Manual Testing Checklist

Before submitting a PR, test your changes:

- [ ] Feature works on desktop (Chrome, Firefox, Safari)
- [ ] Feature works on mobile (iOS Safari, Android Chrome)
- [ ] All translations are present
- [ ] Voice features work (if applicable)
- [ ] No console errors
- [ ] Responsive design works

### Testing Voice Features

1. Enable voice in Settings
2. Test on supported pages (Dashboard, Transactions, Categories, Accounts, Budgets)
3. Test with different languages
4. Verify error handling

## Documentation

### Code Documentation

- Add JSDoc comments to functions and components
- Document complex logic with inline comments
- Keep README files updated

### Feature Documentation

For significant features, create a document in `plans/`:

```markdown
# Feature Name

## Overview
Brief description of the feature

## Architecture
Diagram or description of how it works

## API Endpoints
List of new/modified endpoints

## User Flow
Step-by-step user interaction

## Testing
How to test the feature
```

## Submitting Changes

### Pull Request Process

1. Update documentation to reflect any changes
2. Ensure all tests pass
3. Update the CHANGELOG.md with your changes
4. Submit a pull request with a clear description
5. Link any related issues

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
How you tested the changes

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
- [ ] All translations added
```

## Questions?

If you have questions or need help:
- Open an issue for discussion
- Check existing documentation
- Review similar features in the codebase

Thank you for contributing! 🎉
