import { auth } from '../firebase/config';
import type { Transaction } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export interface VoiceTransactionResponse {
  success: boolean;
  data?: Transaction;
  transcription?: string;
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
    // Get Firebase auth token
    const token = await user.getIdToken();

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
