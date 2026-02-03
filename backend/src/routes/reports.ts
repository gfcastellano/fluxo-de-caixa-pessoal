import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';
import type { Transaction, Category } from '../types';

const reportQuerySchema = z.object({
  year: z.string().transform(Number),
  month: z.string().transform(Number),
});

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', authMiddleware);

app.get('/monthly-summary', async (c) => {
  try {
    const userId = c.get('userId');
    const query = c.req.query();

    const { year, month } = reportQuerySchema.parse(query);

    const firebase = new FirebaseService(c.env);
    const transactions = (await firebase.getDocuments(
      'transactions',
      userId
    )) as Transaction[];

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const monthTransactions = transactions.filter(
      (t) => t.date >= startDate && t.date <= endDate
    );

    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return c.json({
      success: true,
      data: {
        income,
        expenses,
        balance: income - expenses,
        month: new Date(year, month - 1).toLocaleString('default', {
          month: 'long',
        }),
        year,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    return c.json(
      { success: false, error: 'Failed to generate report' },
      500
    );
  }
});

app.get('/category-breakdown', async (c) => {
  try {
    const userId = c.get('userId');
    const query = c.req.query();

    const { year, month } = reportQuerySchema.parse(query);
    const type = c.req.query('type') as 'income' | 'expense';

    const firebase = new FirebaseService(c.env);
    const [transactions, categories] = await Promise.all([
      firebase.getDocuments('transactions', userId) as Promise<Transaction[]>,
      firebase.getDocuments('categories', userId) as Promise<Category[]>,
    ]);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const filteredTransactions = transactions.filter(
      (t) =>
        t.date >= startDate &&
        t.date <= endDate &&
        t.type === type
    );

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const categoryTotals = new Map<string, number>();

    filteredTransactions.forEach((t) => {
      const current = categoryTotals.get(t.categoryId) || 0;
      categoryTotals.set(t.categoryId, current + t.amount);
    });

    const total = Array.from(categoryTotals.values()).reduce(
      (sum, amount) => sum + amount,
      0
    );

    const breakdown = Array.from(categoryTotals.entries()).map(
      ([categoryId, amount]) => {
        const category = categoryMap.get(categoryId);
        return {
          categoryId,
          categoryName: category?.name || 'Unknown',
          categoryColor: category?.color || '#999999',
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        };
      }
    );

    return c.json({
      success: true,
      data: breakdown.sort((a, b) => b.amount - a.amount),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    return c.json(
      { success: false, error: 'Failed to generate report' },
      500
    );
  }
});

export default app;
