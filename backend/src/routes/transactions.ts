import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const transactionSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  categoryId: z.string(),
  date: z.string(),
  accountId: z.string().optional(),
  // Recurring transaction fields
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.enum(['monthly', 'weekly', 'yearly']).nullable().optional(),
  recurrenceDay: z.number().nullable().optional(),
  recurrenceEndDate: z.string().nullable().optional(),
  parentTransactionId: z.string().nullable().optional(),
});

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', authMiddleware);

app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);
    const transactions = await firebase.getDocuments('transactions', userId);
    return c.json({ success: true, data: transactions });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to fetch transactions' },
      500
    );
  }
});

app.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const validated = transactionSchema.parse(body);

    const firebase = new FirebaseService(c.env);
    
    // Create the main transaction
    const transaction = await firebase.createDocument('transactions', {
      ...validated,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // If this is a recurring transaction, generate instances until end of year
    if (validated.isRecurring && validated.recurrencePattern) {
      await generateRecurringInstances(firebase, transaction as { id: string; date: string; isRecurring?: boolean; recurrencePattern?: string; recurrenceDay?: number | null; recurrenceEndDate?: string | null; userId: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string; accountId?: string }, validated);
    }

    return c.json({ success: true, data: transaction }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    return c.json(
      { success: false, error: 'Failed to create transaction' },
      500
    );
  }
});

app.patch('/:id', async (c) => {
  try {
    const transactionId = c.req.param('id');
    const body = await c.req.json();

    const validated = transactionSchema.partial().parse(body);

    const firebase = new FirebaseService(c.env);
    await firebase.updateDocument('transactions', transactionId, {
      ...validated,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    return c.json(
      { success: false, error: 'Failed to update transaction' },
      500
    );
  }
});

app.delete('/:id', async (c) => {
  try {
    const transactionId = c.req.param('id');
    const firebase = new FirebaseService(c.env);
    await firebase.deleteDocument('transactions', transactionId);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to delete transaction' },
      500
    );
  }
});

// Endpoint to generate recurring instances for an existing transaction
app.post('/:id/generate-recurring', async (c) => {
  try {
    const transactionId = c.req.param('id');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    // Get the parent transaction
    const transaction = await firebase.getDocument('transactions', transactionId);
    
    if (!transaction) {
      return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    if (transaction.userId !== userId) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    if (!transaction.isRecurring || !transaction.recurrencePattern) {
      return c.json({ success: false, error: 'Transaction is not recurring' }, 400);
    }

    // Generate recurring instances
    const instances = await generateRecurringInstances(firebase, transaction as { id: string; date: string; isRecurring?: boolean; recurrencePattern?: string; recurrenceDay?: number | null; recurrenceEndDate?: string | null; userId: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string; accountId?: string }, transaction as { recurrencePattern?: string | null; recurrenceDay?: number | null; recurrenceEndDate?: string | null; date: string });

    return c.json({ success: true, data: { generatedCount: instances.length } });
  } catch (error) {
    console.error('Error generating recurring instances:', error);
    return c.json(
      { success: false, error: 'Failed to generate recurring instances' },
      500
    );
  }
});

// Helper function to generate recurring transaction instances
async function generateRecurringInstances(
  firebase: FirebaseService,
  parentTransaction: { id: string; date: string; isRecurring?: boolean; recurrencePattern?: string; recurrenceDay?: number | null; recurrenceEndDate?: string | null; userId: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string; accountId?: string },
  data: { recurrencePattern?: string | null; recurrenceDay?: number | null; recurrenceEndDate?: string | null; date: string }
): Promise<unknown[]> {
  const instances: unknown[] = [];
  const startDate = new Date(data.date);
  const currentYear = new Date().getFullYear();
  const endOfYear = new Date(currentYear, 11, 31); // December 31st
  
  // Use provided end date or end of year, whichever comes first
  const endDate = data.recurrenceEndDate 
    ? new Date(Math.min(new Date(data.recurrenceEndDate).getTime(), endOfYear.getTime()))
    : endOfYear;

  const pattern = data.recurrencePattern;
  const recurrenceDay = data.recurrenceDay;

  let currentDate = new Date(startDate);
  
  // Move to the next period (skip the first date since that's the parent transaction)
  currentDate = getNextDate(currentDate, pattern, recurrenceDay);

  while (currentDate <= endDate) {
    // Check if an instance already exists for this date
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Create the recurring instance
    const instance = await firebase.createDocument('transactions', {
      userId: parentTransaction.userId,
      accountId: parentTransaction.accountId,
      type: parentTransaction.type,
      amount: parentTransaction.amount,
      categoryId: parentTransaction.categoryId,
      description: parentTransaction.description,
      date: dateStr,
      parentTransactionId: parentTransaction.id,
      isRecurring: false, // Instances are not recurring themselves
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    instances.push(instance);

    // Move to next occurrence
    currentDate = getNextDate(currentDate, pattern, recurrenceDay);
  }

  return instances;
}

// Helper function to get the next date based on recurrence pattern
function getNextDate(currentDate: Date, pattern: string | null | undefined, recurrenceDay: number | null | undefined): Date {
  const nextDate = new Date(currentDate);

  switch (pattern) {
    case 'weekly':
      // Add 7 days
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    
    case 'monthly':
      // Move to next month, same day (or last day if day doesn't exist)
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      // If recurrenceDay is specified, use it; otherwise use the current day
      const targetDay = recurrenceDay !== null && recurrenceDay !== undefined ? recurrenceDay : currentDate.getDate();
      const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(targetDay, lastDayOfMonth));
      break;
    
    case 'yearly':
      // Move to next year, same month and day
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    
    default:
      // Default to monthly if no pattern specified
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}

export default app;
