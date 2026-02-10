import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

// Schema for creating a credit card
const creditCardSchema = z.object({
  name: z.string().min(1, 'Card name is required'),
  linkedAccountId: z.string().min(1, 'Linked account is required'),
  creditLimit: z.number().positive('Credit limit must be positive'),
  closingDay: z.number().int().min(1).max(31, 'Closing day must be between 1 and 31'),
  dueDay: z.number().int().min(1).max(31, 'Due day must be between 1 and 31'),
  color: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// Schema for updating a credit card
const creditCardUpdateSchema = creditCardSchema.partial();

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', authMiddleware);

// GET /credit-cards - List all credit cards for the user
app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);
    const creditCards = await firebase.getDocuments('creditCards', userId);
    return c.json({ success: true, data: creditCards });
  } catch (error) {
    console.error('Error fetching credit cards:', error);
    return c.json(
      { success: false, error: 'Failed to fetch credit cards' },
      500
    );
  }
});

// GET /credit-cards/:id - Get a specific credit card
app.get('/:id', async (c) => {
  try {
    const cardId = c.req.param('id');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    const creditCard = await firebase.getDocument('creditCards', cardId);

    if (!creditCard) {
      return c.json(
        { success: false, error: 'Credit card not found' },
        404
      );
    }

    if (creditCard.userId !== userId) {
      return c.json(
        { success: false, error: 'Unauthorized' },
        403
      );
    }

    return c.json({ success: true, data: creditCard });
  } catch (error) {
    console.error('Error fetching credit card:', error);
    return c.json(
      { success: false, error: 'Failed to fetch credit card' },
      500
    );
  }
});

// POST /credit-cards - Create a new credit card
app.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const validated = creditCardSchema.parse(body);

    const firebase = new FirebaseService(c.env);

    // Verify that the linked account exists and belongs to the user
    const linkedAccount = await firebase.getDocument('accounts', validated.linkedAccountId);
    if (!linkedAccount) {
      return c.json(
        { success: false, error: 'Linked account not found' },
        400
      );
    }

    if (linkedAccount.userId !== userId) {
      return c.json(
        { success: false, error: 'Linked account does not belong to user' },
        403
      );
    }

    // If this card is being set as default, unset any existing default
    if (validated.isDefault) {
      const existingCards = await firebase.getDocuments('creditCards', userId) as Array<{ id: string; isDefault?: boolean }>;
      for (const card of existingCards) {
        if (card.isDefault) {
          await firebase.updateDocument('creditCards', card.id, { isDefault: false });
        }
      }
    }

    // Create the credit card
    const creditCard = await firebase.createDocument('creditCards', {
      ...validated,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }) as { id: string };

    // Create the initial open bill for the current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Calculate due date based on dueDay
    let dueDate = new Date(currentYear, currentMonth - 1, validated.dueDay);
    if (dueDate < now) {
      // If due date has passed, set to next month
      dueDate = new Date(currentYear, currentMonth, validated.dueDay);
    }

    await firebase.createDocument('creditCardBills', {
      creditCardId: creditCard.id,
      userId,
      month: currentMonth,
      year: currentYear,
      dueDate: dueDate.toISOString().split('T')[0],
      totalAmount: 0,
      isClosed: false,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true, data: creditCard }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    console.error('Error creating credit card:', error);
    return c.json(
      { success: false, error: 'Failed to create credit card' },
      500
    );
  }
});

// PUT /credit-cards/:id - Update a credit card
app.put('/:id', async (c) => {
  try {
    const cardId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();

    const validated = creditCardUpdateSchema.parse(body);

    const firebase = new FirebaseService(c.env);

    // Check if credit card exists and belongs to user
    const existingCard = await firebase.getDocument('creditCards', cardId);
    if (!existingCard) {
      return c.json(
        { success: false, error: 'Credit card not found' },
        404
      );
    }

    if (existingCard.userId !== userId) {
      return c.json(
        { success: false, error: 'Unauthorized' },
        403
      );
    }

    // If this card is being set as default, unset any existing default
    if (validated.isDefault) {
      const existingCards = await firebase.getDocuments('creditCards', userId) as Array<{ id: string; isDefault?: boolean }>;
      for (const card of existingCards) {
        if (card.isDefault && card.id !== cardId) {
          await firebase.updateDocument('creditCards', card.id, { isDefault: false });
        }
      }
    }

    // If linkedAccountId is being updated, verify the new account
    if (validated.linkedAccountId) {
      const linkedAccount = await firebase.getDocument('accounts', validated.linkedAccountId);
      if (!linkedAccount) {
        return c.json(
          { success: false, error: 'Linked account not found' },
          400
        );
      }
      if (linkedAccount.userId !== userId) {
        return c.json(
          { success: false, error: 'Linked account does not belong to user' },
          403
        );
      }
    }

    await firebase.updateDocument('creditCards', cardId, {
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
    console.error('Error updating credit card:', error);
    return c.json(
      { success: false, error: 'Failed to update credit card' },
      500
    );
  }
});

// DELETE /credit-cards/:id - Delete a credit card
app.delete('/:id', async (c) => {
  try {
    const cardId = c.req.param('id');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    // Check if credit card exists and belongs to user
    const existingCard = await firebase.getDocument('creditCards', cardId);
    if (!existingCard) {
      return c.json(
        { success: false, error: 'Credit card not found' },
        404
      );
    }

    if (existingCard.userId !== userId) {
      return c.json(
        { success: false, error: 'Unauthorized' },
        403
      );
    }

    // Check if there are any unpaid bills
    const bills = await firebase.getDocuments('creditCardBills', userId) as Array<{ 
      creditCardId: string; 
      isPaid: boolean; 
      totalAmount: number;
    }>;
    
    const unpaidBills = bills.filter(
      bill => bill.creditCardId === cardId && !bill.isPaid && bill.totalAmount > 0
    );

    if (unpaidBills.length > 0) {
      return c.json(
        { success: false, error: 'Cannot delete credit card with unpaid bills' },
        400
      );
    }

    // Delete all bills for this card (they should all be paid or empty)
    const cardBills = bills.filter(bill => bill.creditCardId === cardId);
    for (const bill of cardBills) {
      // We need to get the bill ID to delete it
      // Since we don't have the ID in the filtered result, we need to query again
      const allBills = await firebase.getDocuments('creditCardBills', userId) as Array<{ id: string; creditCardId: string }>;
      const billToDelete = allBills.find(b => b.creditCardId === cardId && b.id);
      if (billToDelete) {
        await firebase.deleteDocument('creditCardBills', billToDelete.id);
      }
    }

    // Delete the credit card
    await firebase.deleteDocument('creditCards', cardId);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting credit card:', error);
    return c.json(
      { success: false, error: 'Failed to delete credit card' },
      500
    );
  }
});

export default app;
