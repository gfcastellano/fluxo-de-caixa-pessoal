import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { OpenAIService } from '../services/openai';
import { authMiddleware } from '../middleware/auth';
import type { Transaction, Category } from '../types';
import { getErrorTranslation, getSuccessTranslation, getDefaultTranslation } from '../i18n/voice-translations';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', authMiddleware);

/**
 * POST /api/voice/transactions
 * Create a transaction from voice input
 * Expects multipart/form-data with:
 * - audio: audio file (webm/opus)
 * - language: language code (e.g., 'pt', 'en', 'es')
 */
app.post('/transactions', async (c) => {
  try {
    const userId = c.get('userId');
    console.log('Voice transaction request received for user:', userId);
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = (formData.get('language') as string) || 'en';
    
    console.log('Audio file:', audioFile?.name, 'Size:', audioFile?.size, 'Language:', language);

    if (!audioFile) {
      return c.json(
        { success: false, error: getErrorTranslation(language, 'noAudioFile') },
        400
      );
    }

    // Convert file to array buffer
    const audioBuffer = await audioFile.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return c.json(
        { success: false, error: getErrorTranslation(language, 'emptyAudio') },
        400
      );
    }

    // Initialize services
    const openai = new OpenAIService(c.env);
    const firebase = new FirebaseService(c.env);

    // Step 1: Transcribe audio
    let transcription: string;
    try {
      transcription = await openai.transcribeAudio(audioBuffer, language);
    } catch (error) {
      console.error('Transcription error:', error);
      return c.json(
        { success: false, error: getErrorTranslation(language, 'transcriptionFailed') },
        500
      );
    }

    if (!transcription || transcription.trim().length === 0) {
      return c.json(
        { success: false, error: getErrorTranslation(language, 'noSpeechDetected') },
        400
      );
    }

    // Step 2: Get user's categories for parsing
    let categories: Category[] = [];
    try {
      const categoriesData = await firebase.getDocuments('categories', userId);
      categories = categoriesData as Category[];
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Continue without categories - GPT will return empty categoryId
    }

    // Step 3: Parse transcription into transaction data
    let parsedTransaction: {
      amount: number;
      type: 'income' | 'expense';
      description: string;
      categoryId: string;
      date: string;
    };
    
    try {
      const defaultDescription = getDefaultTranslation(language, 'description');
      parsedTransaction = await openai.parseTransaction(transcription, categories, language, defaultDescription);
    } catch (error) {
      console.error('Parsing error:', error);
      return c.json(
        { 
          success: false, 
          error: getErrorTranslation(language, 'parsingFailed'),
          transcription 
        },
        400
      );
    }

    // Step 4: Create transaction in Firestore
    const now = new Date().toISOString();
    const transactionData = {
      ...parsedTransaction,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const createdTransaction = await firebase.createDocument('transactions', transactionData);

    return c.json({
      success: true,
      data: createdTransaction as Transaction,
      transcription,
      message: getSuccessTranslation(language, 'transactionCreated'),
    }, 201);

  } catch (error) {
    console.error('Voice transaction error:', error);
    // Get language from formData if available, otherwise default to 'en'
    let errorLanguage = 'en';
    try {
      const formData = await c.req.formData();
      errorLanguage = (formData.get('language') as string) || 'en';
    } catch {
      // If we can't get the form data, use default language
    }
    return c.json(
      { success: false, error: getErrorTranslation(errorLanguage, 'processingFailed') },
      500
    );
  }
});

export default app;
