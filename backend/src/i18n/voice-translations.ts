/**
 * Voice feature translations for backend API responses
 * Supports localization of error messages, success messages, and default descriptions
 */

export interface VoiceTranslations {
  errors: {
    noAudioFile: string;
    emptyAudio: string;
    transcriptionFailed: string;
    noSpeechDetected: string;
    parsingFailed: string;
    processingFailed: string;
  };
  success: {
    transactionCreated: string;
  };
  defaults: {
    description: string;
  };
}

export const voiceTranslations: Record<string, VoiceTranslations> = {
  en: {
    errors: {
      noAudioFile: 'No audio file provided',
      emptyAudio: 'Empty audio file',
      transcriptionFailed: 'Failed to transcribe audio',
      noSpeechDetected: 'No speech detected',
      parsingFailed: 'Could not understand the transaction. Please try again.',
      processingFailed: 'Failed to process voice transaction',
    },
    success: {
      transactionCreated: 'Transaction created successfully',
    },
    defaults: {
      description: 'Voice transaction',
    },
  },
  pt: {
    errors: {
      noAudioFile: 'Nenhum arquivo de áudio fornecido',
      emptyAudio: 'Arquivo de áudio vazio',
      transcriptionFailed: 'Falha ao transcrever áudio',
      noSpeechDetected: 'Nenhuma fala detectada',
      parsingFailed: 'Não foi possível entender a transação. Tente novamente.',
      processingFailed: 'Falha ao processar transação por voz',
    },
    success: {
      transactionCreated: 'Transação criada com sucesso',
    },
    defaults: {
      description: 'Transação por voz',
    },
  },
  es: {
    errors: {
      noAudioFile: 'No se proporcionó archivo de audio',
      emptyAudio: 'Archivo de audio vacío',
      transcriptionFailed: 'Error al transcribir el audio',
      noSpeechDetected: 'No se detectó voz',
      parsingFailed: 'No se pudo entender la transacción. Inténtalo de nuevo.',
      processingFailed: 'Error al procesar la transacción por voz',
    },
    success: {
      transactionCreated: 'Transacción creada exitosamente',
    },
    defaults: {
      description: 'Transacción por voz',
    },
  },
};

type ErrorKey = keyof VoiceTranslations['errors'];
type SuccessKey = keyof VoiceTranslations['success'];
type DefaultsKey = keyof VoiceTranslations['defaults'];

/**
 * Get an error translation for a specific key
 * Falls back to English if the language or key is not found
 */
export function getErrorTranslation(language: string, key: ErrorKey): string {
  const translations = voiceTranslations[language] || voiceTranslations.en;
  return translations.errors[key] || voiceTranslations.en.errors[key];
}

/**
 * Get a success translation for a specific key
 * Falls back to English if the language or key is not found
 */
export function getSuccessTranslation(language: string, key: SuccessKey): string {
  const translations = voiceTranslations[language] || voiceTranslations.en;
  return translations.success[key] || voiceTranslations.en.success[key];
}

/**
 * Get a default value translation for a specific key
 * Falls back to English if the language or key is not found
 */
export function getDefaultTranslation(language: string, key: DefaultsKey): string {
  const translations = voiceTranslations[language] || voiceTranslations.en;
  return translations.defaults[key] || voiceTranslations.en.defaults[key];
}

/**
 * Get all translations for a language
 * Useful for passing to services that need multiple translations
 */
export function getVoiceTranslationsForLanguage(language: string): VoiceTranslations {
  return voiceTranslations[language] || voiceTranslations.en;
}
