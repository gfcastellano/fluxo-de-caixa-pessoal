import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  color: z.string(),
  icon: z.string().optional(),
});

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', authMiddleware);

app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);
    const categories = await firebase.getDocuments('categories', userId);
    return c.json({ success: true, data: categories });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to fetch categories' },
      500
    );
  }
});

app.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const validated = categorySchema.parse(body);

    const firebase = new FirebaseService(c.env);
    const category = await firebase.createDocument('categories', {
      ...validated,
      userId,
      createdAt: new Date().toISOString(),
    });

    return c.json({ success: true, data: category }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    return c.json(
      { success: false, error: 'Failed to create category' },
      500
    );
  }
});

app.patch('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    const body = await c.req.json();

    const validated = categorySchema.partial().parse(body);

    const firebase = new FirebaseService(c.env);
    await firebase.updateDocument('categories', categoryId, validated);

    return c.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    return c.json(
      { success: false, error: 'Failed to update category' },
      500
    );
  }
});

app.delete('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    const firebase = new FirebaseService(c.env);
    await firebase.deleteDocument('categories', categoryId);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to delete category' },
      500
    );
  }
});

export default app;
