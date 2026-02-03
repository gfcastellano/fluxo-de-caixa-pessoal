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
    const transaction = await firebase.createDocument('transactions', {
      ...validated,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

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

export default app;
