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
 * POST /api/voice/transactions/update
 * Update a transaction from voice input
 * Expects multipart/form-data with:
 * - audio: audio file (webm/opus)
 * - language: language code (e.g., 'pt', 'en', 'es')
 * - transactionId: ID of the transaction to update
 * - currentTransaction: JSON string of current transaction data
 * - categories: JSON string of available categories
 */
app.post('/transactions/update', async (c) => {
  let language = 'en';
  
  try {
    const userId = c.get('userId');
    
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    language = (formData.get('language') as string) || 'en';
    const transactionId = formData.get('transactionId') as string;
    const currentTransactionStr = formData.get('currentTransaction') as string;
    const categoriesStr = formData.get('categories') as string;
    
    if (!audioFile) {
      return c.json(
        { success: false, error: getErrorTranslation(language, 'noAudioFile') },
        400
      );
    }
    
    if (!transactionId || !currentTransactionStr) {
      return c.json(
        { success: false, error: getErrorTranslation(language, 'processingFailed') },
        400
      );
    }
    
    const audioBuffer = await audioFile.arrayBuffer();
    
    if (audioBuffer.byteLength === 0) {
      return c.json(
        { success: false, error: getErrorTranslation(language, 'emptyAudio') },
        400
      );
    }
    
    const currentTransaction = JSON.parse(currentTransactionStr) as Transaction;
    const categories = categoriesStr ? JSON.parse(categoriesStr) as Category[] : [];
    
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
    
    // Step 2: Parse the voice command for updates
    let updates: Partial<Transaction>;
    try {
      updates = await openai.parseTransactionUpdate(
        transcription,
        currentTransaction,
        categories,
        language
      );
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
    
    // Step 3: Apply updates to Firestore
    const now = new Date().toISOString();
    const updateData = {
      ...updates,
      updatedAt: now,
    };
    
    await firebase.updateDocument('transactions', transactionId, updateData);
    
    return c.json({
      success: true,
      data: updates,
      transcription,
      message: getSuccessTranslation(language, 'transactionUpdated'),
    }, 200);
    
  } catch (error) {
    console.error('Voice transaction update error:', error);
    return c.json(
      { success: false, error: getErrorTranslation(language, 'processingFailed') },
      500
    );
  }
});

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
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = (formData.get('language') as string) || 'en';

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

    // Step 3: Get user's categories for parsing
    let categories: Category[] = [];
    try {
      const categoriesData = await firebase.getDocuments('categories', userId);
      categories = categoriesData as Category[];
    } catch (error) {
      // Continue without categories - GPT will return empty categoryId
    }

    // Step 4: Parse transcription into transaction data
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

    // Step 5: Return parsed transaction data without creating it
    // The transaction will be created when the user clicks the button
    return c.json({
      success: true,
      data: parsedTransaction as Transaction,
      transcription,
      message: getSuccessTranslation(language, 'transactionCreated'),
    }, 200);

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

/**
 * POST /api/voice/categories
 * Create a category from voice input
 * Expects multipart/form-data with:
 * - audio: audio file (webm/opus)
 * - language: language code (e.g., 'pt', 'en', 'es')
 */
app.post('/categories', async (c) => {
  try {
    const userId = c.get('userId');
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = (formData.get('language') as string) || 'en';

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

    // Step 2: Parse transcription into category data
    let parsedCategory: {
      name: string;
      type: 'income' | 'expense';
      color: string;
    };
    
    try {
      parsedCategory = await openai.parseCategory(transcription, language);
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

    // Step 3: Return parsed category data without creating it
    return c.json({
      success: true,
      data: parsedCategory,
      transcription,
      message: getSuccessTranslation(language, 'categoryCreated'),
    }, 200);

  } catch (error) {
    console.error('Voice category error:', error);
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

/**
 * POST /api/voice/budgets
 * Create or update a budget from voice input
 * Expects multipart/form-data with:
 * - audio: audio file (webm/opus)
 * - language: language code (e.g., 'pt', 'en', 'es')
 * - categories: JSON string of available categories
 * - isEditing: boolean indicating if this is an update
 * - currentBudget: JSON string of current budget data (for updates)
 * - budgetId: string (required when isEditing is true)
 */
app.post('/budgets', async (c) => {
  let language = 'en';
  
  try {
    const userId = c.get('userId');
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    language = (formData.get('language') as string) || 'en';
    const categoriesStr = formData.get('categories') as string;
    const isEditing = formData.get('isEditing') === 'true';
    const currentBudgetStr = formData.get('currentBudget') as string;
    const budgetId = formData.get('budgetId') as string;

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

    // Parse categories if provided
    const categories = categoriesStr ? JSON.parse(categoriesStr) as Category[] : [];
    
    // Parse current budget if editing
    let currentBudget: Partial<Budget> | null = null;
    if (isEditing && currentBudgetStr) {
      currentBudget = JSON.parse(currentBudgetStr) as Partial<Budget>;
    }

    // Initialize services
    const openai = new OpenAIService(c.env);

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

    // Step 2: Parse transcription based on mode (create or update)
    let parsedBudget: Partial<Budget> & { matchedCategory?: string | null };
    
    if (isEditing && currentBudget) {
      // Update mode: Parse as partial update
      try {
        parsedBudget = await openai.parseBudgetUpdate(
          transcription,
          currentBudget,
          categories,
          language
        );
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
    } else {
      // Create mode: Parse as new budget
      try {
        const result = await openai.parseBudget(transcription, categories, language);
        parsedBudget = result;
        
        // Validate that a category was matched for new budgets
        if (!parsedBudget.categoryId || parsedBudget.categoryId === '') {
          return c.json(
            {
              success: false,
              error: getErrorTranslation(language, 'categoryNotFound'),
              transcription,
              data: {
                amount: parsedBudget.amount,
                period: parsedBudget.period,
                startDate: parsedBudget.startDate,
                matchedCategory: parsedBudget.matchedCategory,
              }
            },
            400
          );
        }
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
    }

    // Step 3: Return parsed budget data
    return c.json({
      success: true,
      data: parsedBudget,
      transcription,
      message: isEditing 
        ? getSuccessTranslation(language, 'budgetUpdated') 
        : getSuccessTranslation(language, 'budgetCreated'),
    }, 200);

  } catch (error) {
    console.error('Voice budget error:', error);
    return c.json(
      { success: false, error: getErrorTranslation(language, 'processingFailed') },
      500
    );
  }
});

/**
 * POST /api/voice/accounts
 * Create an account from voice input
 * Expects multipart/form-data with:
 * - audio: audio file (webm/opus)
 * - language: language code (e.g., 'pt', 'en', 'es')
 */
app.post('/accounts', async (c) => {
  try {
    const userId = c.get('userId');
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = (formData.get('language') as string) || 'en';

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

    // Step 2: Parse transcription into account data
    let parsedAccount: {
      name: string;
      currency: string;
      balance: number;
      initialBalance: number;
      isDefault: boolean;
    };
    
    try {
      parsedAccount = await openai.parseAccount(transcription, language);
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

    // Step 3: Return parsed account data without creating it
    return c.json({
      success: true,
      data: parsedAccount,
      transcription,
      message: getSuccessTranslation(language, 'accountCreated'),
    }, 200);

  } catch (error) {
    console.error('Voice account error:', error);
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
