# Voice Feature Documentation

## Overview

The Voice Feature allows users to create and update transactions, categories, accounts, and budgets using natural voice commands. The system uses OpenAI's Whisper API for audio transcription and GPT-4 for parsing the transcribed text into structured data.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User Voice    │────▶│  VoiceDock UI    │────▶│ useVoiceRecorder│
│   (Microphone)  │     │  (Recording)     │     │    (Hook)       │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Parsed Data    │◀────│  OpenAI GPT-4    │◀────│  OpenAI Whisper │
│  (Transaction)  │     │  (Parsing)       │     │  (Transcription)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │
│  (/api/voice/*) │
└─────────────────┘
```

## Components

### Frontend Components

#### 1. VoiceDock (`frontend/src/components/VoiceDock.tsx`)
The main navigation dock that includes the voice recording button. It displays on supported pages and provides visual feedback during recording.

**Supported Pages:**
- Dashboard
- Transactions
- Categories
- Accounts
- Budgets

**Features:**
- Visual recording indicator
- Page-aware voice hints
- Integration with VoiceConsentModal

#### 2. VoiceHeroButton (`frontend/src/components/VoiceHeroButton.tsx`)
The circular voice button with animated states:
- Idle: Ready to record
- Recording: Pulsing animation with waveform
- Processing: Loading spinner
- Success: Checkmark animation

#### 3. VoiceConsentModal (`frontend/src/components/VoiceConsentModal.tsx`)
Modal that displays privacy information and requests user consent before enabling voice features.

**Sections:**
- Audio Processing (OpenAI transcription)
- Data Retention (30-day policy)
- Data Usage (No AI training)
- Terms of Service

#### 4. AudioWaveform (`frontend/src/components/AudioWaveform.tsx`)
Real-time audio visualization during recording using the Web Audio API.

### Frontend Hooks

#### useVoiceRecorder (`frontend/src/hooks/useVoiceRecorder.ts`)
Manages the MediaRecorder API for audio capture.

**States:**
- `idle`: Ready to record
- `recording`: Actively capturing audio
- `preview`: Audio captured, waiting for confirmation
- `processing`: Sending to backend
- `success`: Transaction created/updated
- `error`: Something went wrong

**Features:**
- Audio level monitoring for waveform
- Blob generation for upload
- Browser compatibility checks

#### useVoiceForm (`frontend/src/hooks/useVoiceForm.ts`)
Higher-level hook that orchestrates voice recording with form integration.

**Features:**
- Auto-start recording option
- Sound effects (start/stop beeps)
- Feedback management

### Frontend Context

#### VoiceContext (`frontend/src/context/VoiceContext.tsx`)
Global state management for voice features across the application.

**Provides:**
- Current page type detection
- Recording state
- Created item tracking (for edit flow)
- Consent management
- Feedback display

**Flows:**
1. **Create Flow**: Record → Parse → Create → Show in modal
2. **Update Flow**: Record → Parse → Update existing → Confirm

### Backend Services

#### Voice Routes (`backend/src/routes/voice.ts`)
Express-style routes for voice processing.

**Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/voice/transactions` | POST | Create transaction from voice |
| `/api/voice/transactions/update` | POST | Update existing transaction |
| `/api/voice/transactions/update-pending` | POST | Update pending (not yet saved) transaction |
| `/api/voice/categories` | POST | Create category from voice |
| `/api/voice/budgets` | POST | Create/update budget from voice |
| `/api/voice/accounts` | POST | Create account from voice |
| `/api/voice/consent` | GET | Get user's voice consent status |
| `/api/voice/consent` | POST | Save user's voice consent |

#### OpenAI Service (`backend/src/services/openai.ts`)
Handles communication with OpenAI APIs.

**Methods:**
- `transcribeAudio()`: Converts audio to text using Whisper-1
- `parseTransaction()`: Extracts transaction data from text using GPT-4
- `parseUpdateCommand()`: Extracts update instructions from text
- `parseCategory()`: Extracts category data from text
- `parseBudget()`: Extracts budget data from text
- `parseAccount()`: Extracts account data from text

**Prompt Engineering:**
The service uses carefully crafted prompts to guide GPT-4 in extracting structured data from natural language. Examples include:
- Transaction parsing with amount, type, category, date, account
- Update parsing with field detection (amount, date, category, etc.)

#### Voice Translations (`backend/src/i18n/voice-translations.ts`)
Localized messages for voice feature responses.

**Supported Languages:**
- English (en)
- Portuguese (pt)
- Spanish (es)

**Message Types:**
- Error messages (no audio, transcription failed, etc.)
- Success messages (transaction created, updated, etc.)
- Default descriptions

## User Flows

### Creating a Transaction by Voice

1. **Navigate** to a supported page (Transactions, Dashboard, etc.)
2. **Tap** the voice button in the dock
3. **Grant consent** (first time only) - review privacy terms
4. **Speak** naturally: "Spent 50 dollars on Food at Nubank today"
5. **Confirm** the audio (preview screen)
6. **Review** the parsed transaction in the modal
7. **Edit** if needed or save directly

### Updating a Transaction by Voice

1. **Create** a transaction using voice (or select existing)
2. **Tap** "Update by Voice" in the modal
3. **Speak** the changes: "Change the amount to 75 dollars"
4. **Review** the updated fields
5. **Save** the changes

### Creating Other Entities by Voice

**Category:**
- "Create category Food of type expense with green color"

**Account:**
- "Create Nubank account with initial balance of 1000 dollars"

**Budget:**
- "Create budget of 500 dollars for Food monthly"

## Privacy & Security

### Data Flow
1. Audio is recorded in the browser using MediaRecorder API
2. Audio is sent directly to the backend (Cloudflare Workers)
3. Backend sends audio to OpenAI Whisper API
4. OpenAI retains audio for up to 30 days (per their policy)
5. Transcribed text is processed by GPT-4 (not retained)
6. Parsed data is stored in Firebase Firestore

### User Consent
- Explicit opt-in required before first use
- Consent status stored in Firestore per user
- Can be revoked at any time in Settings
- LocalStorage fallback for offline detection

### Security Measures
- HTTPS for all communications
- Firebase Auth JWT for API authentication
- No audio storage on our servers
- OpenAI API key stored as Cloudflare secret

## Configuration

### Required Environment Variables

**Backend (`wrangler.toml` secrets):**
```bash
wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key
```

**Frontend (`.env`):**
```env
VITE_API_URL=http://localhost:8787  # or your deployed backend URL
```

### OpenAI Costs

The voice feature uses:
- **Whisper-1**: $0.006 per minute of audio
- **GPT-4**: Varies by token usage (typically ~$0.01-0.05 per request)

Average cost per voice transaction: ~$0.01-0.02

## Troubleshooting

### Common Issues

**"Microphone permission denied"**
- Check browser permissions
- Ensure HTTPS (required for microphone access)
- Try refreshing the page

**"Could not understand"**
- Speak clearly and at moderate pace
- Include key information (amount, category)
- Check microphone quality

**"Category not found"**
- Create the category first
- Use exact category names
- Check spelling

**"Processing failed"**
- Check internet connection
- Verify backend is running
- Check OpenAI API key is set

### Debug Mode

Enable console logging:
```typescript
// In browser console
localStorage.setItem('voiceDebug', 'true');
```

## Future Enhancements

- [ ] Voice command history
- [ ] Custom voice commands
- [ ] Multi-language voice input
- [ ] Voice-enabled reports ("Show me last month's expenses")
- [ ] Voice reminders and notifications
