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
  // Cash payment flag
  isCash: z.boolean().optional(),
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
      // Find or create the appropriate bill for this transaction date
      const billId = await ensureBillForDate(
        firebase,
        userId,
        transactionData.creditCardId,
        transactionData.date
      );

      transactionData.billId = billId;

      // Update the bill total
      const bill = await firebase.getDocument('creditCardBills', billId) as { totalAmount: number };
      await firebase.updateDocument('creditCardBills', billId, {
        totalAmount: (bill?.totalAmount || 0) + transactionData.amount,
        updatedAt: new Date().toISOString(),
      });
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

// Endpoint to manually trigger recurring instance generation for a transaction
app.post('/:id/generate-recurring', async (c) => {
  try {
    const transactionId = c.req.param('id');
    const firebase = new FirebaseService(c.env);

    // Fetch the transaction
    const transaction = await firebase.getDocument('transactions', transactionId);

    if (!transaction) {
      return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    if (!transaction.isRecurring) {
      return c.json({ success: false, error: 'Transaction is not recurring' }, 400);
    }

    const count = transaction.recurringCount as number | undefined;
    let instances: unknown[] = [];

    // If recurringCount is provided (> 1), generate that many instances
    // We check > 1 because the parent is the first instance
    if (count && count > 1) {
      instances = await generateRecurringInstancesWithCount(
        firebase,
        transaction as any,
        {
          recurrencePattern: transaction.recurrencePattern as string,
          recurrenceDay: transaction.recurrenceDay as number,
          recurrenceEndDate: transaction.recurrenceEndDate as string,
          date: transaction.date as string,
        },
        count - 1
      );
    }
    // Otherwise use end date logic
    else if (transaction.recurrenceEndDate) {
      instances = await generateRecurringInstances(
        firebase,
        transaction as any,
        {
          recurrencePattern: transaction.recurrencePattern as string,
          recurrenceDay: transaction.recurrenceDay as number,
          recurrenceEndDate: transaction.recurrenceEndDate as string,
          date: transaction.date as string,
        }
      );
    }

    return c.json({
      success: true,
      data: {
        generatedCount: instances.length
      }
    });
  } catch (error) {
    console.error('Error generating recurring instances:', error);
    return c.json(
      { success: false, error: 'Failed to generate recurring instances' },
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

// Helper function to ensure a credit card bill exists for a given date
async function ensureBillForDate(
  firebase: FirebaseService,
  userId: string,
  creditCardId: string,
  date: string
): Promise<string> {
  const transactionDate = new Date(date);
  let month = transactionDate.getMonth() + 1;
  let year = transactionDate.getFullYear();
  const day = transactionDate.getDate();

  // First, get the credit card to know the dueDay and closingDay
  const creditCard = await firebase.getDocument('creditCards', creditCardId) as {
    dueDay: number;
    closingDay?: number;
  };

  // If we have a closing day and the transaction is on or after it, move to next month
  if (creditCard && creditCard.closingDay && day >= creditCard.closingDay) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  const dueDay = creditCard?.dueDay || 10;

  // Find if a bill already exists for this month/year
  const allBills = await firebase.getDocuments('creditCardBills', userId) as Array<{
    id: string;
    creditCardId: string;
    month: number;
    year: number;
    isClosed: boolean;
    isPaid: boolean;
  }>;

  const existingBill = allBills.find(
    bill => bill.creditCardId === creditCardId && bill.month === month && bill.year === year
  );

  if (existingBill) {
    return existingBill.id;
  }

  // Use the calculated year/month for due date calculation
  // Carefully handle end of year rollover for due date
  const dueDate = new Date(year, month - 1, dueDay);
  const dueDateStr = dueDate.toISOString().split('T')[0];

  const newBill = await firebase.createDocument('creditCardBills', {
    creditCardId,
    userId,
    month, // calculated month (1-12)
    year,  // calculated year
    dueDate: dueDateStr,
    totalAmount: 0,
    isClosed: false,
    isPaid: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as { id: string };

  return newBill.id;
}

// Helper function to generate recurring transaction instances with a specific count
// Creates exactly 'count' number of instances based on recurrence pattern
async function generateRecurringInstancesWithCount(
  firebase: FirebaseService,
  parentTransaction: { id: string; date: string; isRecurring?: boolean; recurrencePattern?: string; recurrenceDay?: number | null; recurrenceEndDate?: string | null; userId: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string; accountId?: string; creditCardId?: string; isCash?: boolean; installmentNumber?: number; totalInstallments?: number; billId?: string },
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
    const instanceData: Record<string, unknown> = {
      userId: parentTransaction.userId,
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
    };

    // Only add accountId if it exists (credit card transactions don't have accountId)
    if (parentTransaction.accountId) {
      instanceData.accountId = parentTransaction.accountId;
    }

    // Add credit card fields if they exist on parent
    const parentWithCC = parentTransaction as Record<string, unknown>;
    if (parentWithCC.creditCardId) {
      const creditCardId = parentWithCC.creditCardId as string;
      instanceData.creditCardId = creditCardId;

      // Ensure bill exists for this date and link it
      const billId = await ensureBillForDate(firebase, parentTransaction.userId, creditCardId, dateStr);
      instanceData.billId = billId;

      // Update bill total
      const bill = await firebase.getDocument('creditCardBills', billId) as { totalAmount: number };
      await firebase.updateDocument('creditCardBills', billId, {
        totalAmount: (bill?.totalAmount || 0) + parentTransaction.amount,
        updatedAt: new Date().toISOString(),
      });
    }

    if (parentWithCC.isCash) {
      instanceData.isCash = parentWithCC.isCash;
    }

    const instance = await firebase.createDocument('transactions', instanceData);

    instances.push(instance);
  }

  return instances;
}

// Helper function to generate recurring transaction instances
// Creates instances based on recurrence pattern until recurrenceEndDate
// Limited by MAX_INSTANCES_PER_REQUEST to prevent timeouts
async function generateRecurringInstances(
  firebase: FirebaseService,
  parentTransaction: { id: string; date: string; isRecurring?: boolean; recurrencePattern?: string; recurrenceDay?: number | null; recurrenceEndDate?: string | null; userId: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string; accountId?: string; creditCardId?: string; isCash?: boolean; installmentNumber?: number; totalInstallments?: number; billId?: string },
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
      const instanceData: Record<string, unknown> = {
        userId: parentTransaction.userId,
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
      };

      // Only add accountId if it exists (credit card transactions don't have accountId)
      if (parentTransaction.accountId) {
        instanceData.accountId = parentTransaction.accountId;
      }

      // Add credit card fields if they exist on parent
      const parentWithCC = parentTransaction as Record<string, unknown>;
      if (parentWithCC.creditCardId) {
        const creditCardId = parentWithCC.creditCardId as string;
        instanceData.creditCardId = creditCardId;

        // Ensure bill exists for this date and link it
        const billId = await ensureBillForDate(firebase, parentTransaction.userId, creditCardId, dateStr);
        instanceData.billId = billId;

        // Update bill total
        const bill = await firebase.getDocument('creditCardBills', billId) as { totalAmount: number };
        await firebase.updateDocument('creditCardBills', billId, {
          totalAmount: (bill?.totalAmount || 0) + parentTransaction.amount,
          updatedAt: new Date().toISOString(),
        });
      }

      if (parentWithCC.isCash) {
        instanceData.isCash = parentWithCC.isCash;
      }

      const instance = await firebase.createDocument('transactions', instanceData);

      instances.push(instance);
    }

    instanceIndex++;
    // Move to next occurrence based on pattern
    currentDate = getNextDate(currentDate, recurrencePattern, recurrenceDay);
  }

  return instances;
}

// Helper function to update a recurring series of transactions
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
  const seriesTransactions = await firebase.getDocuments('transactions', userId);

  // Filtrar transações que pertencem a esta série
  const series = seriesTransactions.filter((t: any) =>
    t.id === parentId || t.parentTransactionId === parentId
  );

  // Ordenar por installmentNumber (pai geralmente tem 1 ou undefined)
  const sortedSeries = series.sort((a: any, b: any) => {
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
      (t: any) => ((t.installmentNumber as number) || 1) >= currentInstallment
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

  // Se o valor mudou, precisamos atualizar os totais das faturas também
  const amountChanged = updates.amount !== undefined && updates.amount !== transaction.amount;
  const diff = amountChanged ? (updates.amount as number) - (transaction.amount as number) : 0;

  // Atualizar todas as transações e faturas se necessário
  await Promise.all(
    transactionsToUpdate.map(async (t: any) => {
      await firebase.updateDocument('transactions', t.id as string, {
        ...allowedUpdates,
        updatedAt: new Date().toISOString(),
      });

      // Se mudou o valor e é cartão de crédito, atualizar a fatura
      if (amountChanged && t.creditCardId && t.billId) {
        const bill = await firebase.getDocument('creditCardBills', t.billId) as { totalAmount: number };
        await firebase.updateDocument('creditCardBills', t.billId, {
          totalAmount: (bill?.totalAmount || 0) + diff,
          updatedAt: new Date().toISOString(),
        });
      }
    })
  );
}

// Helper function to get the next date based on recurrence pattern
function getNextDate(
  currentDate: Date,
  pattern: string | null | undefined,
  recurrenceDay: number | null | undefined
): Date {
  const nextDate = new Date(currentDate);

  switch (pattern) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
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
      nextDate.setMonth(nextDate.getMonth() + 1);
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
