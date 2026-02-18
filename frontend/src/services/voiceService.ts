import { auth } from '../firebase/config';
import type { Transaction, Category, Account, Budget, CreditCard } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export interface VoiceTransactionResponse {
  success: boolean;
  data?: Transaction;
  transcription?: string;
  message?: string;  // Localized success message from backend
  error?: string;
}

export interface VoiceTransactionUpdateResponse {
  success: boolean;
  data?: Partial<Transaction>;
  transcription?: string;
  message?: string;
  error?: string;
}

export interface VoiceAccountUpdateResponse {
  success: boolean;
  data?: Partial<Account>;
  transcription?: string;
  message?: string;
  error?: string;
}

export interface VoiceBudgetUpdateResponse {
  success: boolean;
  data?: Partial<Budget>;
  transcription?: string;
  message?: string;
  error?: string;
}

export interface VoiceCategoryUpdateResponse {
  success: boolean;
  data?: Partial<Category>;
  transcription?: string;
  message?: string;
  error?: string;
}

export interface VoiceCreditCardUpdateResponse {
  success: boolean;
  data?: Partial<CreditCard>;
  transcription?: string;
  message?: string;
  error?: string;
}

/**
 * Send voice recording to backend for transcription and transaction creation
 */
export async function sendVoiceTransaction(
  audioBlob: Blob,
  language: string
): Promise<VoiceTransactionResponse> {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: 'User not authenticated',
    };
  }

  try {
    // Get Firebase auth token (force refresh to ensure token is valid)
    const token = await user.getIdToken(true);

    // Create form data
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', language);

    // Send to backend
    const response = await fetch(`${API_BASE_URL}/api/voice/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
        transcription: result.transcription,
      };
    }

    return result as VoiceTransactionResponse;
  } catch (error) {
    console.error('Voice service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send voice transaction',
    };
  }
}

/**
 * Send voice recording to backend for updating an existing transaction
 * Used for voice-driven updates like changing dates, amounts, etc.
 * 
 * This function automatically selects the appropriate endpoint:
 * - If the transaction has an ID (already saved): Uses /transactions/update (persists to Firestore)
 * - If the transaction has no ID (pending creation): Uses /transactions/update-pending (no persistence)
 */
export async function sendVoiceTransactionUpdate(
  audioBlob: Blob,
  language: string,
  currentTransaction: Transaction,
  categories: Category[],
  previewOnly: boolean = false
): Promise<VoiceTransactionUpdateResponse> {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: 'User not authenticated',
    };
  }

  try {
    const token = await user.getIdToken(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', language);
    formData.append('currentTransaction', JSON.stringify(currentTransaction));
    formData.append('categories', JSON.stringify(categories));

    // Determine endpoint based on whether transaction has an ID and previewOnly flag
    // If ID exists and is not empty AND previewOnly is false: uses /transactions/update (persists to Firestore)
    // If ID is empty/missing OR previewOnly is true: uses /transactions/update-pending (no persistence)
    const isPersisted = currentTransaction.id && currentTransaction.id.trim() !== '';
    const useUpdateEndpoint = isPersisted && !previewOnly;

    const endpoint = useUpdateEndpoint
      ? `${API_BASE_URL}/api/voice/transactions/update`
      : `${API_BASE_URL}/api/voice/transactions/update-pending`;

    // Add transactionId only for persisted transactions when NOT in preview mode
    if (useUpdateEndpoint) {
      formData.append('transactionId', currentTransaction.id);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
        transcription: result.transcription,
      };
    }

    return result as VoiceTransactionUpdateResponse;
  } catch (error) {
    console.error('Voice update service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send voice transaction update',
    };
  }
}

/**
 * Send voice recording to backend for updating account information
 */
export async function sendVoiceAccountUpdate(
  audioBlob: Blob,
  language: string,
  currentAccount: Partial<Account>,
  isEditing: boolean
): Promise<VoiceAccountUpdateResponse> {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: 'User not authenticated',
    };
  }

  try {
    const token = await user.getIdToken(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', language);
    formData.append('currentAccount', JSON.stringify(currentAccount));
    formData.append('isEditing', isEditing.toString());

    const response = await fetch(`${API_BASE_URL}/api/voice/accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
        transcription: result.transcription,
      };
    }

    return result as VoiceAccountUpdateResponse;
  } catch (error) {
    console.error('Voice account service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process voice account update',
    };
  }
}

/**
 * Send voice recording to backend for updating budget information
 */
export async function sendVoiceBudgetUpdate(
  audioBlob: Blob,
  language: string,
  currentBudget: Partial<Budget>,
  isEditing: boolean,
  categories?: Category[]
): Promise<VoiceBudgetUpdateResponse> {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: 'User not authenticated',
    };
  }

  try {
    const token = await user.getIdToken(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', language);
    formData.append('currentBudget', JSON.stringify(currentBudget));
    formData.append('isEditing', isEditing.toString());

    // Add budgetId when editing
    if (isEditing && currentBudget.id) {
      formData.append('budgetId', currentBudget.id);
    }

    // Add categories for budget parsing
    if (categories && categories.length > 0) {
      formData.append('categories', JSON.stringify(categories));
    }

    const response = await fetch(`${API_BASE_URL}/api/voice/budgets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
        transcription: result.transcription,
      };
    }

    return result as VoiceBudgetUpdateResponse;
  } catch (error) {
    console.error('Voice budget service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process voice budget update',
    };
  }
}

/**
 * Send voice recording to backend for updating category information
 */
export async function sendVoiceCategoryUpdate(
  audioBlob: Blob,
  language: string,
  currentCategory: Partial<Category>,
  isEditing: boolean
): Promise<VoiceCategoryUpdateResponse> {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: 'User not authenticated',
    };
  }

  try {
    const token = await user.getIdToken(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', language);
    formData.append('currentCategory', JSON.stringify(currentCategory));
    formData.append('isEditing', isEditing.toString());

    const response = await fetch(`${API_BASE_URL}/api/voice/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
        transcription: result.transcription,
      };
    }

    return result as VoiceCategoryUpdateResponse;
  } catch (error) {
    console.error('Voice category service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process voice category update',
    };
  }
}

/**
 * Send voice recording to backend for updating credit card information
 */
export async function sendVoiceCreditCardUpdate(
  audioBlob: Blob,
  language: string,
  currentCard: Partial<CreditCard>,
  isEditing: boolean
): Promise<VoiceCreditCardUpdateResponse> {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: 'User not authenticated',
    };
  }

  try {
    const token = await user.getIdToken(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', language);
    formData.append('currentCard', JSON.stringify(currentCard));
    formData.append('isEditing', isEditing.toString());

    // Add cardId when editing
    if (isEditing && currentCard.id) {
      formData.append('cardId', currentCard.id);
    }

    const response = await fetch(`${API_BASE_URL}/api/voice/credit-cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
        transcription: result.transcription,
      };
    }

    return result as VoiceCreditCardUpdateResponse;
  } catch (error) {
    console.error('Voice credit card service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process voice credit card update',
    };
  }
}

/**
 * Voice consent response interface
 */
export interface VoiceConsentResponse {
  success: boolean;
  data?: {
    voiceConsent: boolean;
    voiceConsentDate: string | null;
    voiceConsentVersion: string | null;
  };
  error?: string;
}

/**
 * Get voice consent status for the current user
 */
export async function getVoiceConsent(): Promise<VoiceConsentResponse> {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: 'User not authenticated',
    };
  }

  try {
    const token = await user.getIdToken(true);

    const response = await fetch(`${API_BASE_URL}/api/voice/consent`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
      };
    }

    return result as VoiceConsentResponse;
  } catch (error) {
    console.error('Get voice consent error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get voice consent',
    };
  }
}

/**
 * Save voice consent for the current user
 */
export async function saveVoiceConsent(
  accepted: boolean,
  version = '1.0'
): Promise<{ success: boolean; error?: string }> {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: 'User not authenticated',
    };
  }

  try {
    const token = await user.getIdToken(true);

    const response = await fetch(`${API_BASE_URL}/api/voice/consent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voiceConsent: accepted,
        voiceConsentVersion: version,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Save voice consent error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save voice consent',
    };
  }
}
