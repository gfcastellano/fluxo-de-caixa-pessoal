import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

// Maximum number of recurring instances that can be generated in a single request
// This prevents timeouts when users create recurring transactions with far future end dates
// 24 instances = 2 years of monthly transactions, which is a reasonable limit
const MAX_INSTANCES_PER_REQUEST = 24;

const transactionSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  categoryId: z.string(),
  date: z.string(),
  accountId: z.string().optional(),
  toAccountId: z.string().optional(),
  // Credit card fields
  creditCardId: z.string().optional(),
  billId: z.string().optional(),
  isBillPayment: z.boolean().optional(),
  paidBillId: z.string().optional(),
  // Recurring transaction fields
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.enum(['monthly', 'weekly', 'yearly']).nullable().optional(),
  recurrenceDay: z.number().nullable().optional(),
  recurrenceEndDate: z.string().nullable().optional(),
  parentTransactionId: z.string().nullable().optional(),
  // Recurring count for initial creation
  recurringCount: z.number().min(1).max(60).optional(), // Number of instances to create (1-60)
  createdFromRecurring: z.boolean().optional(), // Mark if created from recurring
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
    
    // Extract recurringCount from validated data (not stored on transaction)
    const { recurringCount, ...transactionData } = validated;

    // Handle credit card transactions
    if (transactionData.creditCardId && transactionData.type === 'expense') {
      // Find the current open bill for this credit card
      const allBills = await firebase.getDocuments('creditCardBills', userId) as Array<{
        creditCardId: string;
        isClosed: boolean;
        isPaid: boolean;
        id: string;
      }>;
      
      const currentBill = allBills.find(
        bill => bill.creditCardId === transactionData.creditCardId && !bill.isClosed && !bill.isPaid
      );

      if (currentBill) {
        transactionData.billId = currentBill.id;
        
        // Update the bill total
        const bill = await firebase.getDocument('creditCardBills', currentBill.id) as { totalAmount: number };
        await firebase.updateDocument('creditCardBills', currentBill.id, {
          totalAmount: (bill?.totalAmount || 0) + transactionData.amount,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Auto-resolve toAccountId for transfers without a destination
    if (transactionData.type === 'transfer' && !transactionData.toAccountId && transactionData.accountId) {
      const sourceAccount = await firebase.getDocument('accounts', transactionData.accountId) as { currency?: string } | null;
      if (sourceAccount?.currency) {
        const allAccounts = await firebase.getDocuments('accounts', userId) as Array<{ id: string; currency?: string; isCash?: boolean }>;
        const cashAccount = allAccounts.find(
          a => a.isCash === true && a.currency === sourceAccount.currency
        );
        if (cashAccount) {
          transactionData.toAccountId = cashAccount.id;
        }
      }
    }

    // Calculate total installments for recurring transactions
    let totalInstallments: number | undefined;
    if (validated.isRecurring) {
      if (recurringCount && recurringCount > 0) {
        totalInstallments = recurringCount;
      } else if (validated.recurrenceEndDate) {
        // Calculate total installments from end date (will be done after parent creation)
        totalInstallments = undefined; // Will calculate after we know the pattern
      }
    }

    // Create the main transaction
    // For recurring transactions, this is the first installment (installmentNumber: 1)
    const transaction = await firebase.createDocument('transactions', {
      ...transactionData,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // If recurring, add installment metadata for the parent (first installment)
      ...(validated.isRecurring ? {
        installmentNumber: 1,
        totalInstallments: totalInstallments, // May be undefined if using endDate, will update after calculation
      } : {}),
    });

    // If recurringCount is provided, create that many recurring instances
    if (recurringCount && recurringCount > 1) {
      await generateRecurringInstancesWithCount(
        firebase,
        transaction as { id: string; date: string; isRecurring?: boolean; recurrencePattern?: string; recurrenceDay?: number | null; recurrenceEndDate?: string | null; userId: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string; accountId?: string },
        validated,
        recurringCount - 1 // Subtract 1 because the main transaction counts as the first
      );
    }
    // If this is a recurring transaction with end date (legacy behavior), generate instances until end date
    else if (validated.isRecurring && validated.recurrenceEndDate) {
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
    const { editMode = 'single', ...updates } = body;

    const firebase = new FirebaseService(c.env);

    // Buscar transação atual
    const transaction = await firebase.getDocument('transactions', transactionId);

    if (!transaction) {
      return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    // Verificar se é parte de série recorrente
    const isRecurringSeries = transaction.isRecurring ||
                              transaction.parentTransactionId ||
                              transaction.isRecurringInstance;

    if (!isRecurringSeries || editMode === 'single') {
      // Edição simples - apenas esta transação
      const validated = transactionSchema.partial().parse(updates);
      await firebase.updateDocument('transactions', transactionId, {
        ...validated,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Edição em massa
      await updateRecurringSeries(firebase, transaction, updates, editMode);
    }

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

// Helper function to generate recurring transaction instances with a specific count
// Creates exactly 'count' number of instances based on recurrence pattern
async function generateRecurringInstancesWithCount(
  firebase: FirebaseService,
  parentTransaction: { id: string; date: string; isRecurring?: boolean; recurrencePattern?: string; recurrenceDay?: number | null; recurrenceEndDate?: string | null; userId: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string; accountId?: string; installmentNumber?: number; totalInstallments?: number },
  data: { recurrencePattern?: string | null; recurrenceDay?: number | null; recurrenceEndDate?: string | null; date: string },
  count: number
): Promise<unknown[]> {
  const instances: unknown[] = [];
  const startDate = new Date(parentTransaction.date);
  const recurrencePattern = data.recurrencePattern || 'monthly';
  const recurrenceDay = data.recurrenceDay;

  // The total in series includes the parent transaction + the instances that will be created
  // count is the number of additional instances (recurringCount - 1)
  const totalInSeries = count + 1;

  let currentDate = new Date(startDate);

  // Create exactly 'count' instances
  for (let i = 0; i < count && i < MAX_INSTANCES_PER_REQUEST; i++) {
    // Move to the next occurrence
    currentDate = getNextDate(currentDate, recurrencePattern, recurrenceDay);
    const dateStr = currentDate.toISOString().split('T')[0];

    // Check if an instance already exists for this date and parent (duplicate prevention)
    const existingInstances = await firebase.queryDocuments('transactions', [
      { field: 'parentTransactionId', op: '==', value: parentTransaction.id },
      { field: 'date', op: '==', value: dateStr },
    ]);

    // Only create if no instance exists for this date
    if (existingInstances.length > 0) {
      continue;
    }

    // Create the recurring instance with isRecurringInstance and createdFromRecurring flags
    // Include recurrencePattern so child transactions display the same as parent
    // installmentNumber starts at 2 because parent is 1
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
      isRecurringInstance: true, // Mark as generated child instance
      createdFromRecurring: true, // Mark that this was created from a recurring transaction
      recurrencePattern: recurrencePattern, // Store the recurrence pattern for display purposes
      installmentNumber: i + 2, // Child instances start from 2 (parent is 1)
      totalInstallments: totalInSeries, // Total number of installments including parent
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    instances.push(instance);
  }

  return instances;
}

// Helper function to generate recurring transaction instances
// Creates instances based on recurrence pattern until recurrenceEndDate
// Limited by MAX_INSTANCES_PER_REQUEST to prevent timeouts
async function generateRecurringInstances(
  firebase: FirebaseService,
  parentTransaction: { id: string; date: string; isRecurring?: boolean; recurrencePattern?: string; recurrenceDay?: number | null; recurrenceEndDate?: string | null; userId: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string; accountId?: string; installmentNumber?: number; totalInstallments?: number },
  data: { recurrencePattern?: string | null; recurrenceDay?: number | null; recurrenceEndDate?: string | null; date: string }
): Promise<unknown[]> {
  const startDate = new Date(parentTransaction.date);

  // Use recurrenceEndDate if provided, otherwise default to end of current year
  let endDate: Date;
  if (data.recurrenceEndDate) {
    endDate = new Date(data.recurrenceEndDate);
  } else {
    // Default to end of current year
    const currentYear = new Date().getFullYear();
    endDate = new Date(currentYear, 11, 31); // December 31
  }
  const recurrencePattern = data.recurrencePattern || 'monthly';
  const recurrenceDay = data.recurrenceDay;

  // First pass: calculate total number of instances that will be created
  // This is needed to set totalInstallments correctly
  let tempDate = new Date(startDate);
  let totalInstancesToCreate = 0;

  // Move to the next occurrence (skip the first date since that's the parent transaction)
  tempDate = getNextDate(tempDate, recurrencePattern, recurrenceDay);

  // Count instances based on pattern until we reach the end date or max limit
  while (tempDate <= endDate && totalInstancesToCreate < MAX_INSTANCES_PER_REQUEST) {
    totalInstancesToCreate++;
    tempDate = getNextDate(tempDate, recurrencePattern, recurrenceDay);
  }

  // Total in series includes parent (1) + instances to be created
  const totalInSeries = totalInstancesToCreate + 1;

  // Update the parent transaction with the calculated totalInstallments
  if (parentTransaction.id && totalInSeries > 1) {
    await firebase.updateDocument('transactions', parentTransaction.id, {
      totalInstallments: totalInSeries,
      updatedAt: new Date().toISOString(),
    });
  }

  // Second pass: create the instances
  const instances: unknown[] = [];
  let currentDate = new Date(startDate);
  let instanceIndex = 0;

  // Move to the next occurrence (skip the first date since that's the parent transaction)
  currentDate = getNextDate(currentDate, recurrencePattern, recurrenceDay);

  // Create instances based on pattern until we reach the end date or max limit
  while (currentDate <= endDate && instanceIndex < MAX_INSTANCES_PER_REQUEST) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Check if an instance already exists for this date and parent
    const existingInstances = await firebase.queryDocuments('transactions', [
      { field: 'parentTransactionId', op: '==', value: parentTransaction.id },
      { field: 'date', op: '==', value: dateStr },
    ]);

    // Only create if no instance exists for this date
    if (existingInstances.length === 0) {
      // Create the recurring instance with isRecurringInstance flag
      // Include recurrencePattern so child transactions display the same as parent
      // installmentNumber starts at 2 because parent is 1
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
        isRecurringInstance: true, // Mark as generated child instance
        recurrencePattern: recurrencePattern, // Store the recurrence pattern for display purposes
        installmentNumber: instanceIndex + 2, // Parent is 1, so instances start at 2
        totalInstallments: totalInSeries, // Total including parent
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      instances.push(instance);
    }

    instanceIndex++;
    // Move to next occurrence based on pattern
    currentDate = getNextDate(currentDate, recurrencePattern, recurrenceDay);
  }

  return instances;
}

// Helper function to update a recurring series of transactions
// Updates multiple transactions based on editMode: 'forward' | 'all'
async function updateRecurringSeries(
  firebase: FirebaseService,
  transaction: Record<string, unknown>,
  updates: Record<string, unknown>,
  editMode: 'forward' | 'all'
): Promise<void> {
  // Determinar o ID da transação pai
  const transactionId = transaction.id as string;
  const parentId = (transaction.parentTransactionId as string | null | undefined) || transactionId;
  const userId = transaction.userId as string;

  // Buscar todas as transações da série (pai + filhas)
  const seriesTransactions = await firebase.queryDocuments('transactions', [
    { field: 'userId', op: '==', value: userId },
  ]);

  // Filtrar transações que pertencem a esta série
  const series = seriesTransactions.filter((t: Record<string, unknown>) =>
    t.id === parentId || t.parentTransactionId === parentId
  );

  // Ordenar por installmentNumber (pai geralmente tem 1 ou undefined)
  const sortedSeries = series.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const numA = (a.installmentNumber as number) || 1;
    const numB = (b.installmentNumber as number) || 1;
    return numA - numB;
  });

  // Determinar quais transações atualizar baseado no editMode
  const currentInstallment = (transaction.installmentNumber as number) || 1;

  let transactionsToUpdate: typeof sortedSeries;

  if (editMode === 'forward') {
    // Atualizar da selecionada em diante
    transactionsToUpdate = sortedSeries.filter(
      (t: Record<string, unknown>) => ((t.installmentNumber as number) || 1) >= currentInstallment
    );
  } else {
    // 'all' - atualizar todas da série
    transactionsToUpdate = sortedSeries;
  }

  // Campos permitidos para atualização
  const allowedUpdates: Record<string, unknown> = {};
  if (updates.description !== undefined) allowedUpdates.description = updates.description;
  if (updates.amount !== undefined) allowedUpdates.amount = updates.amount;
  if (updates.type !== undefined) allowedUpdates.type = updates.type;
  if (updates.categoryId !== undefined) allowedUpdates.categoryId = updates.categoryId;
  if (updates.accountId !== undefined) allowedUpdates.accountId = updates.accountId;

  // Atualizar todas as transações em paralelo
  await Promise.all(
    transactionsToUpdate.map((t: Record<string, unknown>) =>
      firebase.updateDocument('transactions', t.id as string, {
        ...allowedUpdates,
        updatedAt: new Date().toISOString(),
      })
    )
  );
}

// Helper function to get the next date based on recurrence pattern
// Handles 'monthly', 'weekly', and 'yearly' patterns
function getNextDate(
  currentDate: Date,
  pattern: string | null | undefined,
  recurrenceDay: number | null | undefined
): Date {
  const nextDate = new Date(currentDate);

  switch (pattern) {
    case 'weekly':
      // Move to next week (7 days)
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case 'yearly':
      // Move to next year
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      // If recurrenceDay is specified, use it; otherwise use the current day
      const targetDayYearly = recurrenceDay !== null && recurrenceDay !== undefined
        ? recurrenceDay
        : currentDate.getDate();
      const lastDayOfMonthYearly = new Date(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        0
      ).getDate();
      nextDate.setDate(Math.min(targetDayYearly, lastDayOfMonthYearly));
      break;

    case 'monthly':
    default:
      // Move to next month
      nextDate.setMonth(nextDate.getMonth() + 1);
      // If recurrenceDay is specified, use it; otherwise use the current day
      const targetDayMonthly = recurrenceDay !== null && recurrenceDay !== undefined
        ? recurrenceDay
        : currentDate.getDate();
      const lastDayOfMonthMonthly = new Date(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        0
      ).getDate();
      nextDate.setDate(Math.min(targetDayMonthly, lastDayOfMonthMonthly));
      break;
  }

  return nextDate;
}

export default app;
