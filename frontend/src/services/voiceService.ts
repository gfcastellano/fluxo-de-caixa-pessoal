import { auth } from '../firebase/config';
import type { Transaction, Category } from '../types';

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
 */
export async function sendVoiceTransactionUpdate(
  audioBlob: Blob,
  language: string,
  currentTransaction: Transaction,
  categories: Category[]
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
    formData.append('transactionId', currentTransaction.id);
    formData.append('currentTransaction', JSON.stringify(currentTransaction));
    formData.append('categories', JSON.stringify(categories));

    const response = await fetch(`${API_BASE_URL}/api/voice/transactions/update`, {
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
