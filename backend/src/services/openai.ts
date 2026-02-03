import type { Env } from '../types/context';
import type { Category, Transaction } from '../types';

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  categoryId: string;
  date: string;
}

export class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(env: Env) {
    // Strip quotes from API key if present
    this.apiKey = (env.OPENAI_API_KEY || '').replace(/^["']|["']$/g, '');
  }

  /**
   * Transcribe audio using Whisper-1
   */
  async transcribeAudio(audioBuffer: ArrayBuffer, language: string): Promise<string> {
    console.log('Starting transcription, buffer size:', audioBuffer.byteLength);
    
    // Convert ArrayBuffer to Uint8Array for Cloudflare Workers compatibility
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Create a File object instead of Blob for better compatibility
    const file = new File([uint8Array], 'audio.webm', { type: 'audio/webm' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'text');

    console.log('Sending to OpenAI Whisper API...');
    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Transcription API error:', response.status, error);
      throw new Error(`Transcription failed: ${error}`);
    }

    const text = await response.text();
    console.log('Transcription successful:', text);
    return text;
  }

  /**
   * Parse transcription into transaction data using GPT-4
   */
  async parseTransaction(
    transcription: string,
    categories: Category[]
  ): Promise<ParsedTransaction> {
    const today = new Date().toISOString().split('T')[0];
    
    // Build category mapping for the prompt
    const categoryList = categories
      .map(c => `"${c.name}" (ID: ${c.id}, Type: ${c.type})`)
      .join('\n');

    const prompt = `Parse the following voice command into a transaction object.

Available categories:
${categoryList}

Voice command: "${transcription}"

Extract and return ONLY a JSON object with these exact fields:
- amount: number (always positive, extract the numeric value)
- type: "income" or "expense" (determine from context - words like "spent", "paid", "bought" indicate expense; "received", "earned", "got" indicate income)
- description: string (what the transaction is for, keep it concise)
- categoryId: string (match to most appropriate category ID based on description, or empty string if uncertain)
- date: string in YYYY-MM-DD format (default to "${today}" if not specified)

Examples:
- "I spent 50 euros on groceries" → {"amount": 50, "type": "expense", "description": "Groceries", "categoryId": "...", "date": "${today}"}
- "Received 1000 salary" → {"amount": 1000, "type": "income", "description": "Salary", "categoryId": "...", "date": "${today}"}
- "Paid 25 for lunch yesterday" → {"amount": 25, "type": "expense", "description": "Lunch", "categoryId": "...", "date": "YYYY-MM-DD for yesterday"}

Response must be valid JSON only, no markdown, no explanation.`;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a financial transaction parser. Extract transaction details from voice commands and return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('GPT parsing API error:', response.status, error);
      throw new Error(`Parsing failed: ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };

    const content = data.choices[0]?.message?.content || '';
    console.log('GPT response:', content);
    
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || 
                      content.match(/```\s*([\s\S]*?)```/) ||
                      [null, content];
    
    const jsonString = jsonMatch[1]?.trim() || content.trim();
    console.log('Extracted JSON:', jsonString);
    
    try {
      const parsed = JSON.parse(jsonString) as Partial<ParsedTransaction>;
      console.log('Parsed transaction:', parsed);
      
      // Validate required fields
      if (typeof parsed.amount !== 'number' || parsed.amount <= 0) {
        throw new Error('Invalid or missing amount');
      }
      
      if (!parsed.type || !['income', 'expense'].includes(parsed.type)) {
        throw new Error('Invalid or missing type');
      }
      
      if (!parsed.description || typeof parsed.description !== 'string') {
        parsed.description = 'Voice transaction';
      }

      return {
        amount: parsed.amount,
        type: parsed.type as 'income' | 'expense',
        description: parsed.description,
        categoryId: parsed.categoryId || '',
        date: parsed.date || today,
      };
    } catch (error) {
      throw new Error(`Failed to parse transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
