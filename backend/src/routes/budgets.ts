import { Hono } from 'hono';
import type { Context } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const budgetSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  period: z.enum(['monthly', 'yearly']),
  startDate: z.string(),
});

const app = new Hono<Context>();

app.use('*', authMiddleware);

app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);
    const budgets = await firebase.getDocuments('budgets', userId);
    return c.json({ success: true, data: budgets });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to fetch budgets' },
      500
    );
  }
});

app.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const validated = budgetSchema.parse(body);

    const firebase = new FirebaseService(c.env);
    const budget = await firebase.createDocument('budgets', {
      ...validated,
      userId,
      createdAt: new Date().toISOString(),
    });

    return c.json({ success: true, data: budget }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    return c.json(
      { success: false, error: 'Failed to create budget' },
      500
    );
  }
});

app.patch('/:id', async (c) => {
  try {
    const budgetId = c.req.param('id');
    const body = await c.req.json();

    const validated = budgetSchema.partial().parse(body);

    const firebase = new FirebaseService(c.env);
    await firebase.updateDocument('budgets', budgetId, validated);

    return c.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    return c.json(
      { success: false, error: 'Failed to update budget' },
      500
    );
  }
});

app.delete('/:id', async (c) => {
  try {
    const budgetId = c.req.param('id');
    const firebase = new FirebaseService(c.env);
    await firebase.deleteDocument('budgets', budgetId);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to delete budget' },
      500
    );
  }
});

export default app;
