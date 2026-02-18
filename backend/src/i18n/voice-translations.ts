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
    categoryNotFound: string;
  };
  success: {
    transactionCreated: string;
    transactionUpdated: string;
    categoryCreated: string;
    budgetCreated: string;
    budgetUpdated: string;
    accountCreated: string;
    accountUpdated: string;
    creditCardCreated: string;
    creditCardUpdated: string;
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
      categoryNotFound: 'Category not found. Please create the category first.',
    },
    success: {
      transactionCreated: 'Transaction created successfully',
      transactionUpdated: 'Transaction updated successfully',
      categoryCreated: 'Category parsed successfully',
      budgetCreated: 'Budget parsed successfully',
      budgetUpdated: 'Budget updated successfully',
      accountCreated: 'Account parsed successfully',
      accountUpdated: 'Account details updated',
      creditCardCreated: 'Credit card created successfully',
      creditCardUpdated: 'Credit card details updated',
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
      categoryNotFound: 'Categoria não encontrada. Por favor, crie a categoria primeiro.',
    },
    success: {
      transactionCreated: 'Transação criada com sucesso',
      transactionUpdated: 'Transação atualizada com sucesso',
      categoryCreated: 'Categoria processada com sucesso',
      budgetCreated: 'Orçamento processado com sucesso',
      budgetUpdated: 'Orçamento atualizado com sucesso',
      accountCreated: 'Conta processada com sucesso',
      accountUpdated: 'Detalhes da conta atualizados',
      creditCardCreated: 'Cartão de crédito criado com sucesso',
      creditCardUpdated: 'Detalhes do cartão atualizados',
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
      categoryNotFound: 'Categoría no encontrada. Por favor, crea la categoría primero.',
    },
    success: {
      transactionCreated: 'Transacción creada exitosamente',
      transactionUpdated: 'Transacción actualizada exitosamente',
      categoryCreated: 'Categoría procesada exitosamente',
      budgetCreated: 'Presupuesto procesado exitosamente',
      budgetUpdated: 'Presupuesto actualizado exitosamente',
      accountCreated: 'Cuenta procesada exitosamente',
      accountUpdated: 'Detalles de la cuenta actualizados', // Added based on the provided snippet
      creditCardCreated: 'Tarjeta de crédito creada con éxito',
      creditCardUpdated: 'Detalles de la tarjeta actualizados',
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
