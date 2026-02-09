import type { Env } from '../types/context';
import type { Category, Transaction, Budget } from '../types';

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  categoryId: string;
  date: string;
  accountId?: string;
  toAccountId?: string;
  isRecurring?: boolean;
  recurrencePattern?: 'monthly' | 'weekly' | 'yearly' | null;
  recurrenceDay?: number | null;
  recurrenceEndDate?: string | null;
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
    defaultDescription: string = 'Voice transaction',
    accounts: { id: string; name: string; isCash?: boolean }[] = []
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

    // Build account mapping for the prompt (include isCash flag to help GPT identify cash accounts)
    const accountList = accounts
      .map(a => `"${a.name}" (ID: ${a.id}${a.isCash ? ', Cash: true' : ''})`)
      .join('\n') || 'No accounts available';

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

Available accounts:
${accountList}

Voice command: "${transcription}"

Extract and return ONLY a JSON object with these exact fields:
- amount: number (always positive, extract the numeric value)
- type: "income", "expense", or "transfer" (determine from context - words like "spent", "paid", "bought" indicate expense; "received", "earned", "got" indicate income; "transfer", "withdraw", "saque", "sacar", "mover", "enviar para", "transferir", "retirar" indicate transfer)
- description: string (what the transaction is for, keep it concise, ${langInstruction})
- categoryId: string (match to most appropriate category ID based on description, or empty string if uncertain. For transfers, pick the best matching transfer-type category: use "Withdrawal" category for withdrawals/cash keywords like "saque"/"sacar"/"withdraw"/"retirar", use "Transfer" category for generic transfers like "transferir"/"mover"/"enviar")
- date: string in YYYY-MM-DD format (default to "${today}" if not specified)
- accountId: string (match to account ID if user mentions an account name like "from account X", "na conta Y", "en la cuenta Z", or empty string if not specified. For transfers, this is the SOURCE account)
- toAccountId: string (for transfers only: the DESTINATION account ID. If user says "saque"/"sacar"/"withdraw cash", set this to the cash account (marked Cash: true) with the same currency. Empty string if not a transfer)
- isRecurring: boolean (true if user mentions recurring patterns like "every month", "monthly", "semanal", "cada mes", "todo mes", false otherwise)
- recurrencePattern: "monthly", "weekly", "yearly", or null (extract from context - "every month"/"cada mes"/"mensal" = monthly, "every week"/"cada semana"/"semanal" = weekly, "every year"/"cada ano"/"anual" = yearly)
- recurrenceDay: number or null (day of month for monthly, day of week 1-7 for weekly, day of year for yearly - extract if mentioned, otherwise null)
- recurrenceEndDate: string in YYYY-MM-DD format or null (end date if mentioned, otherwise null)

IMPORTANT INSTRUCTIONS:
1. The description field MUST be returned in the specified language (${language}).
2. Use the CURRENT DATE (${today}) as the default date - GPT's training data cutoff does not matter, use the current date provided above.
3. For relative dates like "yesterday", "last week", "next month", calculate based on the current date (${today}).
4. For recurring transactions, look for keywords like: "every month", "monthly", "cada mes", "todo mes", "mensal" (monthly); "every week", "weekly", "cada semana", "semanal" (weekly); "every year", "yearly", "cada ano", "anual" (yearly).
5. For account selection, match the account name mentioned by the user to the available accounts list.
6. For "transfer" type: the user is moving money between accounts. "accountId" = source account (from), "toAccountId" = destination account (to). Keywords: "transferir"/"saque"/"sacar"/"withdraw"/"mover"/"enviar para"/"retirar". If user says "saque" or "sacar dinheiro" without specifying a destination, set toAccountId to the cash account (account marked with Cash: true) of the same currency as the source account.

Examples:
- "I spent 50 euros on groceries" (en) → {"amount": 50, "type": "expense", "description": "Groceries", "categoryId": "...", "date": "${today}", "accountId": "", "toAccountId": "", "isRecurring": false, "recurrencePattern": null, "recurrenceDay": null, "recurrenceEndDate": null}
- "Gastei 50 euros em supermercado na conta Sabadell" (pt) → {"amount": 50, "type": "expense", "description": "Supermercado", "categoryId": "...", "date": "${today}", "accountId": "sabadell-id", "toAccountId": "", "isRecurring": false, "recurrencePattern": null, "recurrenceDay": null, "recurrenceEndDate": null}
- "Paguei 100 euros de aluguel todo mes" (pt) → {"amount": 100, "type": "expense", "description": "Aluguel", "categoryId": "...", "date": "${today}", "accountId": "", "toAccountId": "", "isRecurring": true, "recurrencePattern": "monthly", "recurrenceDay": null, "recurrenceEndDate": null}
- "Saquei 200 reais da Nubank" (pt) → {"amount": 200, "type": "transfer", "description": "Saque", "categoryId": "transfer-category-id", "date": "${today}", "accountId": "nubank-id", "toAccountId": "cash-brl-id", "isRecurring": false, "recurrencePattern": null, "recurrenceDay": null, "recurrenceEndDate": null}
- "Transfer 100 from Sabadell to cash" (en) → {"amount": 100, "type": "transfer", "description": "Transfer", "categoryId": "transfer-category-id", "date": "${today}", "accountId": "sabadell-id", "toAccountId": "cash-eur-id", "isRecurring": false, "recurrencePattern": null, "recurrenceDay": null, "recurrenceEndDate": null}
- "Gasté 50 euros en supermercado" (es) → {"amount": 50, "type": "expense", "description": "Supermercado", "categoryId": "...", "date": "${today}", "accountId": "", "toAccountId": "", "isRecurring": false, "recurrencePattern": null, "recurrenceDay": null, "recurrenceEndDate": null}

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
      
      if (!parsed.type || !['income', 'expense', 'transfer'].includes(parsed.type)) {
        throw new Error('Invalid or missing type');
      }

      if (!parsed.description || typeof parsed.description !== 'string') {
        parsed.description = defaultDescription;
      }

      return {
        amount: parsed.amount,
        type: parsed.type as 'income' | 'expense' | 'transfer',
        description: parsed.description,
        categoryId: parsed.categoryId ?? '',
        date: parsed.date ?? today,
        accountId: parsed.accountId ?? '',
        toAccountId: parsed.toAccountId ?? '',
        isRecurring: parsed.isRecurring ?? false,
        recurrencePattern: parsed.recurrencePattern ?? null,
        recurrenceDay: parsed.recurrenceDay ?? null,
        recurrenceEndDate: parsed.recurrenceEndDate ?? null,
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
    language: string = 'en',
    accounts: { id: string; name: string; isCash?: boolean }[] = []
  ): Promise<Partial<Transaction>> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    const categoryList = categories
      .map(c => `"${c.name}" (ID: ${c.id}, Type: ${c.type})`)
      .join('\n');

    const accountList = accounts
      .map(a => `"${a.name}" (ID: ${a.id}${a.isCash ? ', Cash: true' : ''})`)
      .join('\n') || 'No accounts available';

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
- Account ID: ${currentTransaction.accountId || 'Not set'}
- To Account ID: ${currentTransaction.toAccountId || 'Not set'}
- Is Recurring: ${currentTransaction.isRecurring || false}
- Recurrence Pattern: ${currentTransaction.recurrencePattern || 'Not set'}

CURRENT DATE INFORMATION (use this as reference for any relative dates):
- Current date: ${today}
- Current year: ${currentYear}
- Current month: ${currentMonth}
- Current day: ${currentDay}

Available categories:
${categoryList}

Available accounts:
${accountList}

Voice command: "${transcription}"

Analyze the voice command and determine what changes the user wants to make to the current transaction.
Return ONLY a JSON object with the fields that should be updated. Include only fields that need to change.

Possible fields to update:
- amount: number (if the user mentions a new amount)
- type: "income", "expense", or "transfer" (if the user wants to change the type. "transfer"/"transferir"/"saque"/"sacar"/"mover" indicate transfer)
- description: string (if the user wants to change the description, ${langInstruction})
- categoryId: string (if the user mentions a different category, match to most appropriate category ID)
- date: string in YYYY-MM-DD format (if the user mentions a different date - use current date ${today} as reference for relative dates like "yesterday", "next week", etc.)
- accountId: string (if the user mentions a different source account, match to account ID from available accounts)
- toAccountId: string (for transfers: the destination account ID. If changing to transfer type and user says "saque"/"cash", use the cash account)
- isRecurring: boolean (if the user wants to set or unset recurring status)
- recurrencePattern: "monthly", "weekly", "yearly", or null (if the user mentions recurring pattern changes)
- recurrenceDay: number or null (if the user mentions a specific day for recurrence)
- recurrenceEndDate: string in YYYY-MM-DD format or null (if the user mentions an end date for recurrence)

IMPORTANT INSTRUCTIONS:
1. Only include fields in the JSON that the user explicitly wants to change.
2. For date changes, calculate the exact date based on the current date (${today}).
3. For category changes, return the categoryId from the available categories list.
4. For account changes, return the accountId from the available accounts list.
5. The description field MUST be returned in the specified language (${language}).
6. For recurring transactions, look for keywords like: "every month", "monthly", "cada mes", "todo mes", "mensal" (monthly); "every week", "weekly", "cada semana", "semanal" (weekly); "every year", "yearly", "cada ano", "anual" (yearly).

Examples:
- Current: {amount: 50, description: "Groceries", date: "${today}"}, Command: "change the amount to 100" → {"amount": 100}
- Current: {date: "${today}"}, Command: "move it to yesterday" → {"date": "YYYY-MM-DD for yesterday"}
- Current: {description: "Lunch"}, Command: "change it to dinner" → {"description": "Dinner"}
- Current: {categoryId: "abc"}, Command: "this should be entertainment" → {"categoryId": "xyz"} (where xyz is the entertainment category ID)
- Current: {accountId: "abc"}, Command: "change to account Sabadell" → {"accountId": "sabadell-id"} (where sabadell-id is the Sabadell account ID)
- Current: {isRecurring: false}, Command: "make it recurring every month" → {"isRecurring": true, "recurrencePattern": "monthly"}

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
      
      if (parsed.type !== undefined && ['income', 'expense', 'transfer'].includes(parsed.type)) {
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
  ): Promise<{ categoryId: string; amount: number; period: 'monthly' | 'yearly'; startDate: string; matchedCategory: string | null }> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const categoryList = categories
      .map(c => `"${c.name}" (ID: ${c.id}, Type: ${c.type})`)
      .join('\n');

    const periodExamples: Record<string, string> = {
      en: '- "Set a budget of 500 for groceries" → {"categoryId": "...", "amount": 500, "period": "monthly", "startDate": "${today}", "matchedCategory": "Groceries"}\n- "Annual budget of 5000 for vacation" → {"categoryId": "...", "amount": 5000, "period": "yearly", "startDate": "${today}", "matchedCategory": "Vacation"}',
      pt: '- "Orçamento mensal de 1000 reais para transporte" → {"categoryId": "...", "amount": 1000, "period": "monthly", "startDate": "${today}", "matchedCategory": "Transport"}\n- "Orçamento anual de 5000 para férias" → {"categoryId": "...", "amount": 5000, "period": "yearly", "startDate": "${today}", "matchedCategory": "Vacation"}',
      es: '- "Presupuesto mensual de 1000 para transporte" → {"categoryId": "...", "amount": 1000, "period": "monthly", "startDate": "${today}", "matchedCategory": "Transport"}\n- "Presupuesto anual de 5000 para vacaciones" → {"categoryId": "...", "amount": 5000, "period": "yearly", "startDate": "${today}", "matchedCategory": "Vacation"}',
    };
    
    const examples = periodExamples[language] || periodExamples.en;

    const prompt = `Parse the following voice command into a budget object.

CURRENT DATE: ${today}

Available categories:
${categoryList || 'No categories available'}

Voice command: "${transcription}"

Extract and return ONLY a JSON object with these exact fields:
- categoryId: string (match to most appropriate category ID from the available categories list, or empty string if no match found)
- amount: number (the budget amount, always positive)
- period: "monthly" or "yearly" (default to "monthly" if not specified)
- startDate: string in YYYY-MM-DD format (default to "${today}" if not specified)
- matchedCategory: string or null (the name of the category that was matched, or null if no category matched)

IMPORTANT MATCHING RULES:
1. Compare the category mentioned in the voice command with the available categories list
2. Use fuzzy matching: "Pet Shop" should match "PetShop", "petshop", "Pet", etc.
3. Consider variations and translations: "transporte" matches "Transport", "comida" matches "Food", etc.
4. If NO category matches well, return empty string for categoryId and null for matchedCategory

PERIOD RECOGNITION:
- "monthly", "mensal", "mensual" → "monthly"
- "yearly", "anual", "anual" → "yearly"

Examples:
${examples}
- "Orçamento de 500 para Pet Shop" (when "Pet Shop" exists) → {"categoryId": "...", "amount": 500, "period": "monthly", "startDate": "${today}", "matchedCategory": "Pet Shop"}
- "Orçamento de 500 para XYZ" (when "XYZ" doesn't exist) → {"categoryId": "", "amount": 500, "period": "monthly", "startDate": "${today}", "matchedCategory": null}

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
      const parsed = JSON.parse(jsonString) as Partial<{ categoryId: string; amount: number; period: string; startDate: string; matchedCategory: string | null }>;
      
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
        matchedCategory: parsed.matchedCategory || null,
      };
    } catch (error) {
      throw new Error(`Failed to parse budget: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse transcription into budget update data using GPT-4
   * Used for partial updates to existing budgets
   */
  async parseBudgetUpdate(
    transcription: string,
    currentBudget: Partial<Budget>,
    categories: Category[],
    language: string = 'en'
  ): Promise<Partial<Budget> & { matchedCategory?: string | null }> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const categoryList = categories
      .map(c => `"${c.name}" (ID: ${c.id}, Type: ${c.type})`)
      .join('\n');

    const periodExamples: Record<string, string> = {
      en: '- "Change the period to yearly" → {"period": "yearly"}\n- "Update the amount to 1000" → {"amount": 1000}\n- "Change category to groceries" → {"categoryId": "...", "matchedCategory": "Groceries"}',
      pt: '- "Mude o período para anual" → {"period": "yearly"}\n- "Altere o valor para 1000" → {"amount": 1000}\n- "Mude a categoria para transporte" → {"categoryId": "...", "matchedCategory": "Transport"}',
      es: '- "Cambie el período a anual" → {"period": "yearly"}\n- "Actualice el monto a 1000" → {"amount": 1000}\n- "Cambie la categoría a transporte" → {"categoryId": "...", "matchedCategory": "Transport"}',
    };
    
    const examples = periodExamples[language] || periodExamples.en;

    const prompt = `You are helping update an existing budget based on a voice command.

CURRENT BUDGET:
- Category ID: ${currentBudget.categoryId || 'Not set'}
- Amount: ${currentBudget.amount || 'Not set'}
- Period: ${currentBudget.period || 'Not set'}
- Start Date: ${currentBudget.startDate || 'Not set'}

CURRENT DATE: ${today}

Available categories:
${categoryList || 'No categories available'}

Voice command: "${transcription}"

Analyze the voice command and determine what changes the user wants to make to the current budget.
Return ONLY a JSON object with the fields that should be updated. Include only fields that need to change.

Possible fields to update:
- categoryId: string (if the user mentions a different category, match to most appropriate category ID from available categories)
- amount: number (if the user mentions a new amount)
- period: "monthly" or "yearly" (if the user wants to change the period)
- startDate: string in YYYY-MM-DD format (if the user mentions a different start date)
- matchedCategory: string or null (the name of the category that was matched, or null if no category matched)

IMPORTANT INSTRUCTIONS:
1. Only include fields in the JSON that the user explicitly wants to change.
2. For category changes, use fuzzy matching: "transporte" matches "Transport", "comida" matches "Food", etc.
3. For period changes, recognize these keywords:
   - "monthly", "mensal", "mensual" → "monthly"
   - "yearly", "anual", "anual" → "yearly"
4. The matchedCategory field should contain the name of the category that was matched (for reference)

Examples:
${examples}

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
            content: 'You are a financial budget update parser. Extract only the fields that need to be changed from voice commands and return valid JSON only.',
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
      const parsed = JSON.parse(jsonString) as Partial<Budget> & { matchedCategory?: string | null };
      
      // Validate and clean up the updates
      const updates: Partial<Budget> & { matchedCategory?: string | null } = {};
      
      if (parsed.categoryId !== undefined && typeof parsed.categoryId === 'string') {
        updates.categoryId = parsed.categoryId;
      }
      
      if (parsed.amount !== undefined && typeof parsed.amount === 'number' && parsed.amount > 0) {
        updates.amount = parsed.amount;
      }
      
      if (parsed.period !== undefined && ['monthly', 'yearly'].includes(parsed.period)) {
        updates.period = parsed.period as 'monthly' | 'yearly';
      }
      
      if (parsed.startDate !== undefined && typeof parsed.startDate === 'string') {
        updates.startDate = parsed.startDate;
      }
      
      if (parsed.matchedCategory !== undefined) {
        updates.matchedCategory = parsed.matchedCategory;
      }
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to parse budget updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
