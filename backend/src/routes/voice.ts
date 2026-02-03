import { Hono } from 'hono';
import type { Context } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { OpenAIService } from '../services/openai';
import { authMiddleware } from '../middleware/auth';
import type { Transaction, Category } from '../types';

const app = new Hono<Context>();

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
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = (formData.get('language') as string) || 'en';

    if (!audioFile) {
      return c.json(
        { success: false, error: 'No audio file provided' },
        400
      );
    }

    // Convert file to array buffer
    const audioBuffer = await audioFile.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return c.json(
        { success: false, error: 'Empty audio file' },
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
        { success: false, error: 'Failed to transcribe audio' },
        500
      );
    }

    if (!transcription || transcription.trim().length === 0) {
      return c.json(
        { success: false, error: 'No speech detected' },
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
      parsedTransaction = await openai.parseTransaction(transcription, categories);
    } catch (error) {
      console.error('Parsing error:', error);
      return c.json(
        { 
          success: false, 
          error: 'Could not understand the transaction. Please try again.',
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
    }, 201);

  } catch (error) {
    console.error('Voice transaction error:', error);
    return c.json(
      { success: false, error: 'Failed to process voice transaction' },
      500
    );
  }
});

export default app;
