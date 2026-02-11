import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', authMiddleware);

// GET /credit-card-bills - List all bills for the user
app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);
    const bills = await firebase.getDocuments('creditCardBills', userId);
    return c.json({ success: true, data: bills });
  } catch (error) {
    console.error('Error fetching credit card bills:', error);
    return c.json(
      { success: false, error: 'Failed to fetch credit card bills' },
      500
    );
  }
});

// GET /credit-card-bills/card/:creditCardId - List all bills for a specific card
app.get('/card/:creditCardId', async (c) => {
  try {
    const creditCardId = c.req.param('creditCardId');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    // Verify the credit card belongs to the user
    const creditCard = await firebase.getDocument('creditCards', creditCardId);
    if (!creditCard || creditCard.userId !== userId) {
      return c.json(
        { success: false, error: 'Credit card not found or unauthorized' },
        404
      );
    }

    const allBills = await firebase.getDocuments('creditCardBills', userId) as Array<{
      creditCardId: string;
      year: number;
      month: number;
    }>;

    const bills = allBills
      .filter(bill => bill.creditCardId === creditCardId)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    return c.json({ success: true, data: bills });
  } catch (error) {
    console.error('Error fetching credit card bills:', error);
    return c.json(
      { success: false, error: 'Failed to fetch credit card bills' },
      500
    );
  }
});

// GET /credit-card-bills/current/:creditCardId - Get the current open bill
app.get('/current/:creditCardId', async (c) => {
  try {
    const creditCardId = c.req.param('creditCardId');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    // Verify the credit card belongs to the user
    const creditCard = await firebase.getDocument('creditCards', creditCardId);
    if (!creditCard || creditCard.userId !== userId) {
      return c.json(
        { success: false, error: 'Credit card not found or unauthorized' },
        404
      );
    }

    const allBills = await firebase.getDocuments('creditCardBills', userId) as Array<{
      creditCardId: string;
      isClosed: boolean;
      isPaid: boolean;
    }>;

    const currentBill = allBills.find(
      bill => bill.creditCardId === creditCardId && !bill.isClosed && !bill.isPaid
    );

    if (!currentBill) {
      return c.json(
        { success: false, error: 'No open bill found' },
        404
      );
    }

    return c.json({ success: true, data: currentBill });
  } catch (error) {
    console.error('Error fetching current bill:', error);
    return c.json(
      { success: false, error: 'Failed to fetch current bill' },
      500
    );
  }
});

// GET /credit-card-bills/:id/transactions - Get all transactions for a bill
app.get('/:id/transactions', async (c) => {
  try {
    const billId = c.req.param('id');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    // Verify the bill belongs to the user
    const bill = await firebase.getDocument('creditCardBills', billId);
    if (!bill || bill.userId !== userId) {
      return c.json(
        { success: false, error: 'Bill not found or unauthorized' },
        404
      );
    }

    // Get all transactions for this bill
    const allTransactions = await firebase.getDocuments('transactions', userId) as Array<{
      billId?: string;
      date: string;
    }>;

    const transactions = allTransactions
      .filter(t => t.billId === billId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return c.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching bill transactions:', error);
    return c.json(
      { success: false, error: 'Failed to fetch bill transactions' },
      500
    );
  }
});

// POST /credit-card-bills/:id/close - Close a bill manually
app.post('/:id/close', async (c) => {
  try {
    const billId = c.req.param('id');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    // Verify the bill belongs to the user
    const bill = await firebase.getDocument('creditCardBills', billId) as {
      userId: string;
      isClosed: boolean;
      isPaid: boolean;
      creditCardId: string;
    } | null;

    if (!bill || bill.userId !== userId) {
      return c.json(
        { success: false, error: 'Bill not found or unauthorized' },
        404
      );
    }

    if (bill.isClosed) {
      return c.json(
        { success: false, error: 'Bill is already closed' },
        400
      );
    }

    if (bill.isPaid) {
      return c.json(
        { success: false, error: 'Cannot close a paid bill' },
        400
      );
    }

    // Get credit card info for calculating next due date
    const creditCard = await firebase.getDocument('creditCards', bill.creditCardId) as {
      dueDay: number;
    } | null;

    if (!creditCard) {
      return c.json(
        { success: false, error: 'Credit card not found' },
        404
      );
    }

    const now = new Date();
    const closingDate = now.toISOString().split('T')[0];

    // Calculate next month's due date
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, creditCard.dueDay);
    const nextDueDate = nextMonth.toISOString().split('T')[0];

    // Close the current bill
    await firebase.updateDocument('creditCardBills', billId, {
      isClosed: true,
      closingDate,
      updatedAt: new Date().toISOString(),
    });

    // Create a new bill for the next month
    const nextMonthNumber = nextMonth.getMonth() + 1; // 1-12
    const nextYear = nextMonth.getFullYear();

    await firebase.createDocument('creditCardBills', {
      creditCardId: bill.creditCardId,
      userId,
      month: nextMonthNumber,
      year: nextYear,
      dueDate: nextDueDate,
      totalAmount: 0,
      isClosed: false,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        message: 'Bill closed successfully',
        closingDate,
        nextDueDate
      }
    });
  } catch (error) {
    console.error('Error closing bill:', error);
    return c.json(
      { success: false, error: 'Failed to close bill' },
      500
    );
  }
});

// Schema for paying a bill
const payBillSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
});

// POST /credit-card-bills/:id/pay - Pay a bill
app.post('/:id/pay', async (c) => {
  try {
    const billId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();

    const validated = payBillSchema.parse(body);

    const firebase = new FirebaseService(c.env);

    // Verify the bill belongs to the user
    const bill = await firebase.getDocument('creditCardBills', billId) as {
      userId: string;
      isClosed: boolean;
      isPaid: boolean;
      creditCardId: string;
      totalAmount: number;
      dueDate: string;
    } | null;

    if (!bill || bill.userId !== userId) {
      return c.json(
        { success: false, error: 'Bill not found or unauthorized' },
        404
      );
    }

    if (bill.isPaid) {
      return c.json(
        { success: false, error: 'Bill is already paid' },
        400
      );
    }

    if (!bill.isClosed) {
      return c.json(
        { success: false, error: 'Bill must be closed before payment' },
        400
      );
    }

    // Verify the account belongs to the user
    const account = await firebase.getDocument('accounts', validated.accountId);
    if (!account || account.userId !== userId) {
      return c.json(
        { success: false, error: 'Account not found or unauthorized' },
        404
      );
    }

    // Verify the category belongs to the user
    const category = await firebase.getDocument('categories', validated.categoryId);
    if (!category || category.userId !== userId) {
      return c.json(
        { success: false, error: 'Category not found or unauthorized' },
        404
      );
    }

    // Get credit card info
    const creditCard = await firebase.getDocument('creditCards', bill.creditCardId) as {
      name: string;
    } | null;

    const paidAt = new Date().toISOString();

    // Mark bill as paid
    await firebase.updateDocument('creditCardBills', billId, {
      isPaid: true,
      paidAt,
      paidFromAccountId: validated.accountId,
      updatedAt: paidAt,
    });

    // Create a transaction for the bill payment
    await firebase.createDocument('transactions', {
      userId,
      accountId: validated.accountId,
      type: 'expense',
      amount: bill.totalAmount,
      categoryId: validated.categoryId,
      description: `Pagamento fatura ${creditCard?.name || 'Cartão'} - ${bill.dueDate}`,
      date: paidAt.split('T')[0],
      isBillPayment: true,
      paidBillId: billId,
      createdAt: paidAt,
      updatedAt: paidAt,
    });

    return c.json({
      success: true,
      data: {
        message: 'Bill paid successfully',
        paidAt,
        amount: bill.totalAmount
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    console.error('Error paying bill:', error);
    return c.json(
      { success: false, error: 'Failed to pay bill' },
      500
    );
  }
});

export default app;
