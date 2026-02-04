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
    // Convert ArrayBuffer to Uint8Array for Cloudflare Workers compatibility
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Create a File object instead of Blob for better compatibility
    const file = new File([uint8Array], 'audio.webm', { type: 'audio/webm' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'text');

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transcription failed: ${error}`);
    }

    return response.text();
  }

  /**
   * Parse transcription into transaction data using GPT-4
   * @param transcription - The transcribed text from the audio
   * @param categories - Available categories for matching
   * @param language - The language code for the response (e.g., 'en', 'pt', 'es')
   * @param defaultDescription - Default description to use if parsing fails
   */
  async parseTransaction(
    transcription: string,
    categories: Category[],
    language: string = 'en',
    defaultDescription: string = 'Voice transaction'
  ): Promise<ParsedTransaction> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentDateTime = now.toISOString();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    // Build category mapping for the prompt
    const categoryList = categories
      .map(c => `"${c.name}" (ID: ${c.id}, Type: ${c.type})`)
      .join('\n');

    // Language-specific instructions for the description
    const languageInstructions: Record<string, string> = {
      en: 'Return the description in English',
      pt: 'Return the description in Portuguese (Português)',
      es: 'Return the description in Spanish (Español)',
    };
    
    const langInstruction = languageInstructions[language] || languageInstructions.en;

    const prompt = `Parse the following voice command into a transaction object.

CURRENT DATE INFORMATION (use this as reference for any relative dates):
- Current date: ${today}
- Current year: ${currentYear}
- Current month: ${currentMonth}
- Current day: ${currentDay}
- Full timestamp: ${currentDateTime}

Available categories:
${categoryList}

Voice command: "${transcription}"

Extract and return ONLY a JSON object with these exact fields:
- amount: number (always positive, extract the numeric value)
- type: "income" or "expense" (determine from context - words like "spent", "paid", "bought" indicate expense; "received", "earned", "got" indicate income)
- description: string (what the transaction is for, keep it concise, ${langInstruction})
- categoryId: string (match to most appropriate category ID based on description, or empty string if uncertain)
- date: string in YYYY-MM-DD format (default to "${today}" if not specified)

IMPORTANT INSTRUCTIONS:
1. The description field MUST be returned in the specified language (${language}).
2. Use the CURRENT DATE (${today}) as the default date - GPT's training data cutoff does not matter, use the current date provided above.
3. For relative dates like "yesterday", "last week", "next month", calculate based on the current date (${today}).

Examples:
- "I spent 50 euros on groceries" (en) → {"amount": 50, "type": "expense", "description": "Groceries", "categoryId": "...", "date": "${today}"}
- "Gastei 50 euros em supermercado" (pt) → {"amount": 50, "type": "expense", "description": "Supermercado", "categoryId": "...", "date": "${today}"}
- "Gasté 50 euros en supermercado" (es) → {"amount": 50, "type": "expense", "description": "Supermercado", "categoryId": "...", "date": "${today}"}

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
    
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || 
                      content.match(/```\s*([\s\S]*?)```/) ||
                      [null, content];
    
    const jsonString = jsonMatch[1]?.trim() || content.trim();
    
    try {
      const parsed = JSON.parse(jsonString) as Partial<ParsedTransaction>;
      
      // Validate required fields
      if (typeof parsed.amount !== 'number' || parsed.amount <= 0) {
        throw new Error('Invalid or missing amount');
      }
      
      if (!parsed.type || !['income', 'expense'].includes(parsed.type)) {
        throw new Error('Invalid or missing type');
      }
      
      if (!parsed.description || typeof parsed.description !== 'string') {
        parsed.description = defaultDescription;
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

  /**
   * Parse voice command for updating an existing transaction
   * Returns only the fields that should be updated
   */
  async parseTransactionUpdate(
    transcription: string,
    currentTransaction: Transaction,
    categories: Category[],
    language: string = 'en'
  ): Promise<Partial<Transaction>> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    const categoryList = categories
      .map(c => `"${c.name}" (ID: ${c.id}, Type: ${c.type})`)
      .join('\n');

    const languageInstructions: Record<string, string> = {
      en: 'Return the description in English',
      pt: 'Return the description in Portuguese (Português)',
      es: 'Return the description in Spanish (Español)',
    };
    
    const langInstruction = languageInstructions[language] || languageInstructions.en;

    const prompt = `You are helping update an existing transaction based on a voice command.

CURRENT TRANSACTION:
- Description: ${currentTransaction.description}
- Amount: ${currentTransaction.amount}
- Type: ${currentTransaction.type}
- Category ID: ${currentTransaction.categoryId}
- Date: ${currentTransaction.date}

CURRENT DATE INFORMATION (use this as reference for any relative dates):
- Current date: ${today}
- Current year: ${currentYear}
- Current month: ${currentMonth}
- Current day: ${currentDay}

Available categories:
${categoryList}

Voice command: "${transcription}"

Analyze the voice command and determine what changes the user wants to make to the current transaction.
Return ONLY a JSON object with the fields that should be updated. Include only fields that need to change.

Possible fields to update:
- amount: number (if the user mentions a new amount)
- type: "income" or "expense" (if the user wants to change the type)
- description: string (if the user wants to change the description, ${langInstruction})
- categoryId: string (if the user mentions a different category, match to most appropriate category ID)
- date: string in YYYY-MM-DD format (if the user mentions a different date - use current date ${today} as reference for relative dates like "yesterday", "next week", etc.)

IMPORTANT INSTRUCTIONS:
1. Only include fields in the JSON that the user explicitly wants to change.
2. For date changes, calculate the exact date based on the current date (${today}).
3. For category changes, return the categoryId from the available categories list.
4. The description field MUST be returned in the specified language (${language}).

Examples:
- Current: {amount: 50, description: "Groceries", date: "${today}"}, Command: "change the amount to 100" → {"amount": 100}
- Current: {date: "${today}"}, Command: "move it to yesterday" → {"date": "YYYY-MM-DD for yesterday"}
- Current: {description: "Lunch"}, Command: "change it to dinner" → {"description": "Dinner"}
- Current: {categoryId: "abc"}, Command: "this should be entertainment" → {"categoryId": "xyz"} (where xyz is the entertainment category ID)

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
            content: 'You are a financial transaction update parser. Extract only the fields that need to be changed from voice commands and return valid JSON only.',
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
    
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || 
                      content.match(/```\s*([\s\S]*?)```/) ||
                      [null, content];
    
    const jsonString = jsonMatch[1]?.trim() || content.trim();
    
    try {
      const parsed = JSON.parse(jsonString) as Partial<Transaction>;
      
      // Validate and clean up the updates
      const updates: Partial<Transaction> = {};
      
      if (parsed.amount !== undefined && typeof parsed.amount === 'number' && parsed.amount > 0) {
        updates.amount = parsed.amount;
      }
      
      if (parsed.type !== undefined && ['income', 'expense'].includes(parsed.type)) {
        updates.type = parsed.type;
      }
      
      if (parsed.description !== undefined && typeof parsed.description === 'string' && parsed.description.trim()) {
        updates.description = parsed.description.trim();
      }
      
      if (parsed.categoryId !== undefined && typeof parsed.categoryId === 'string') {
        updates.categoryId = parsed.categoryId;
      }
      
      if (parsed.date !== undefined && typeof parsed.date === 'string') {
        updates.date = parsed.date;
      }
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to parse transaction updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse transcription into category data using GPT-4
   */
  async parseCategory(
    transcription: string,
    language: string = 'en'
  ): Promise<{ name: string; type: 'income' | 'expense'; color: string }> {
    const languageInstructions: Record<string, string> = {
      en: 'Return the name in English',
      pt: 'Return the name in Portuguese (Português)',
      es: 'Return the name in Spanish (Español)',
    };
    
    const langInstruction = languageInstructions[language] || languageInstructions.en;

    const prompt = `Parse the following voice command into a category object.

Voice command: "${transcription}"

Extract and return ONLY a JSON object with these exact fields:
- name: string (the category name, ${langInstruction})
- type: "income" or "expense" (determine from context - words like "salary", "income" indicate income; "expense", "cost", "spent" indicate expense)
- color: string (a hex color code like "#FF5733", choose an appropriate color for the category type - use warm colors for expenses, cool colors for income)

Examples:
- "Create a groceries category for expenses" → {"name": "Groceries", "type": "expense", "color": "#FF6B6B"}
- "Nova categoria salário" → {"name": "Salário", "type": "income", "color": "#4ECDC4"}
- "Nueva categoría entretenimiento" → {"name": "Entretenimiento", "type": "expense", "color": "#FFE66D"}

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
            content: 'You are a financial category parser. Extract category details from voice commands and return valid JSON only.',
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
    
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                      content.match(/```\s*([\s\S]*?)```/) ||
                      [null, content];
    
    const jsonString = jsonMatch[1]?.trim() || content.trim();
    
    try {
      const parsed = JSON.parse(jsonString) as Partial<{ name: string; type: string; color: string }>;
      
      // Validate required fields
      if (!parsed.name || typeof parsed.name !== 'string') {
        throw new Error('Invalid or missing name');
      }
      
      if (!parsed.type || !['income', 'expense'].includes(parsed.type)) {
        throw new Error('Invalid or missing type');
      }
      
      if (!parsed.color || typeof parsed.color !== 'string') {
        parsed.color = parsed.type === 'income' ? '#4ECDC4' : '#FF6B6B';
      }

      return {
        name: parsed.name,
        type: parsed.type as 'income' | 'expense',
        color: parsed.color,
      };
    } catch (error) {
      throw new Error(`Failed to parse category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse transcription into budget data using GPT-4
   */
  async parseBudget(
    transcription: string,
    categories: Category[],
    language: string = 'en'
  ): Promise<{ categoryId: string; amount: number; period: 'monthly' | 'yearly'; startDate: string }> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const categoryList = categories
      .map(c => `"${c.name}" (ID: ${c.id}, Type: ${c.type})`)
      .join('\n');

    const prompt = `Parse the following voice command into a budget object.

CURRENT DATE: ${today}

Available categories:
${categoryList}

Voice command: "${transcription}"

Extract and return ONLY a JSON object with these exact fields:
- categoryId: string (match to most appropriate category ID from the available categories list, or empty string if uncertain)
- amount: number (the budget amount, always positive)
- period: "monthly" or "yearly" (default to "monthly" if not specified)
- startDate: string in YYYY-MM-DD format (default to "${today}" if not specified)

Examples:
- "Set a budget of 500 for groceries" → {"categoryId": "...", "amount": 500, "period": "monthly", "startDate": "${today}"}
- "Orçamento mensal de 1000 reais para transporte" → {"categoryId": "...", "amount": 1000, "period": "monthly", "startDate": "${today}"}
- "Presupuesto anual de 5000 para vacaciones" → {"categoryId": "...", "amount": 5000, "period": "yearly", "startDate": "${today}"}

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
            content: 'You are a financial budget parser. Extract budget details from voice commands and return valid JSON only.',
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
    
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                      content.match(/```\s*([\s\S]*?)```/) ||
                      [null, content];
    
    const jsonString = jsonMatch[1]?.trim() || content.trim();
    
    try {
      const parsed = JSON.parse(jsonString) as Partial<{ categoryId: string; amount: number; period: string; startDate: string }>;
      
      // Validate required fields
      if (typeof parsed.amount !== 'number' || parsed.amount <= 0) {
        throw new Error('Invalid or missing amount');
      }
      
      if (!parsed.period || !['monthly', 'yearly'].includes(parsed.period)) {
        parsed.period = 'monthly';
      }

      return {
        categoryId: parsed.categoryId || '',
        amount: parsed.amount,
        period: parsed.period as 'monthly' | 'yearly',
        startDate: parsed.startDate || today,
      };
    } catch (error) {
      throw new Error(`Failed to parse budget: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse transcription into account data using GPT-4
   */
  async parseAccount(
    transcription: string,
    language: string = 'en'
  ): Promise<{ name: string; currency: string; balance: number; initialBalance: number; isDefault: boolean }> {
    const languageInstructions: Record<string, string> = {
      en: 'Return the name in English',
      pt: 'Return the name in Portuguese (Português)',
      es: 'Return the name in Spanish (Español)',
    };
    
    const langInstruction = languageInstructions[language] || languageInstructions.en;

    const prompt = `Parse the following voice command into an account object.

Voice command: "${transcription}"

Extract and return ONLY a JSON object with these exact fields:
- name: string (the account name like "Bank Account", "Credit Card", "Cash", "Savings", ${langInstruction})
- currency: string (3-letter currency code like "USD", "EUR", "BRL", "GBP". Default to "USD" if not specified)
- balance: number (the current balance, default to 0 if not specified)
- initialBalance: number (same as balance, default to 0 if not specified)
- isDefault: boolean (whether this should be the default account, default to false)

Examples:
- "Create a new bank account with 1000 dollars" → {"name": "Bank Account", "currency": "USD", "balance": 1000, "initialBalance": 1000, "isDefault": false}
- "Nova conta corrente com 500 reais" → {"name": "Conta Corrente", "currency": "BRL", "balance": 500, "initialBalance": 500, "isDefault": false}
- "Nueva cuenta de ahorros en euros" → {"name": "Cuenta de Ahorros", "currency": "EUR", "balance": 0, "initialBalance": 0, "isDefault": false}

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
            content: 'You are a financial account parser. Extract account details from voice commands and return valid JSON only.',
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
    
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                      content.match(/```\s*([\s\S]*?)```/) ||
                      [null, content];
    
    const jsonString = jsonMatch[1]?.trim() || content.trim();
    
    try {
      const parsed = JSON.parse(jsonString) as Partial<{ name: string; currency: string; balance: number; initialBalance: number; isDefault: boolean }>;
      
      // Validate required fields
      if (!parsed.name || typeof parsed.name !== 'string') {
        throw new Error('Invalid or missing name');
      }
      
      if (!parsed.currency || typeof parsed.currency !== 'string') {
        parsed.currency = 'USD';
      }
      
      if (typeof parsed.balance !== 'number') {
        parsed.balance = 0;
      }

      return {
        name: parsed.name,
        currency: parsed.currency.toUpperCase(),
        balance: parsed.balance,
        initialBalance: parsed.initialBalance ?? parsed.balance,
        isDefault: parsed.isDefault ?? false,
      };
    } catch (error) {
      throw new Error(`Failed to parse account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
