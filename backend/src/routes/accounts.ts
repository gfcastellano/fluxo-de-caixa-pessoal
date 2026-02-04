import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const accountSchema = z.object({
  name: z.string().min(1),
  currency: z.string().min(1),
  balance: z.number(),
  initialBalance: z.number(),
  isDefault: z.boolean().optional(),
});

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', authMiddleware);

// GET /accounts - Listar todas as contas do usuário autenticado
app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);
    const accounts = await firebase.getDocuments('accounts', userId);
    return c.json({ success: true, data: accounts });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to fetch accounts' },
      500
    );
  }
});

// POST /accounts - Criar uma nova conta
app.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const validated = accountSchema.parse(body);

    const firebase = new FirebaseService(c.env);

    // Verificar se é a primeira conta do usuário
    const existingAccounts = await firebase.getDocuments('accounts', userId);
    const isFirstAccount = existingAccounts.length === 0;

    // Se for a primeira conta, definir como padrão automaticamente
    const isDefault = isFirstAccount ? true : (validated.isDefault || false);

    // Se a nova conta for definida como padrão, remover o padrão das outras contas
    if (isDefault && !isFirstAccount) {
      const accounts = await firebase.getDocuments('accounts', userId) as Array<{ id: string; isDefault?: boolean }>;
      for (const account of accounts) {
        if (account.isDefault) {
          await firebase.updateDocument('accounts', account.id, { isDefault: false });
        }
      }
    }

    const account = await firebase.createDocument('accounts', {
      ...validated,
      userId,
      isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true, data: account }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: error.errors[0].message },
        400
      );
    }
    return c.json(
      { success: false, error: 'Failed to create account' },
      500
    );
  }
});

// GET /accounts/:id - Obter uma conta específica
app.get('/:id', async (c) => {
  try {
    const accountId = c.req.param('id');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    const account = await firebase.getDocument('accounts', accountId);

    if (!account) {
      return c.json(
        { success: false, error: 'Account not found' },
        404
      );
    }

    // Verificar se a conta pertence ao usuário autenticado
    if (account.userId !== userId) {
      return c.json(
        { success: false, error: 'Unauthorized' },
        403
      );
    }

    return c.json({ success: true, data: account });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to fetch account' },
      500
    );
  }
});

// PUT /accounts/:id - Atualizar uma conta
app.put('/:id', async (c) => {
  try {
    const accountId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();

    const validated = accountSchema.partial().parse(body);

    const firebase = new FirebaseService(c.env);

    // Verificar se a conta existe e pertence ao usuário
    const existingAccount = await firebase.getDocument('accounts', accountId);
    if (!existingAccount) {
      return c.json(
        { success: false, error: 'Account not found' },
        404
      );
    }

    if (existingAccount.userId !== userId) {
      return c.json(
        { success: false, error: 'Unauthorized' },
        403
      );
    }

    // Se isDefault estiver sendo atualizado para true
    if (validated.isDefault === true) {
      const accounts = await firebase.getDocuments('accounts', userId) as Array<{ id: string; isDefault?: boolean }>;
      for (const account of accounts) {
        if (account.id !== accountId && account.isDefault) {
          await firebase.updateDocument('accounts', account.id, { isDefault: false });
        }
      }
    }

    await firebase.updateDocument('accounts', accountId, {
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
      { success: false, error: 'Failed to update account' },
      500
    );
  }
});

// DELETE /accounts/:id - Deletar uma conta
app.delete('/:id', async (c) => {
  try {
    const accountId = c.req.param('id');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    // Verificar se a conta existe e pertence ao usuário
    const existingAccount = await firebase.getDocument('accounts', accountId);
    if (!existingAccount) {
      return c.json(
        { success: false, error: 'Account not found' },
        404
      );
    }

    if (existingAccount.userId !== userId) {
      return c.json(
        { success: false, error: 'Unauthorized' },
        403
      );
    }

    // Verificar se é a única conta do usuário
    const accounts = await firebase.getDocuments('accounts', userId) as Array<{ id: string; isDefault?: boolean }>;
    if (accounts.length <= 1) {
      return c.json(
        { success: false, error: 'Cannot delete the only account. At least one account is required.' },
        400
      );
    }

    // Se a conta sendo deletada é a padrão, definir outra como padrão
    const isDefault = (existingAccount as { isDefault?: boolean }).isDefault;
    if (isDefault) {
      const otherAccount = accounts.find(acc => acc.id !== accountId);
      if (otherAccount) {
        await firebase.updateDocument('accounts', otherAccount.id, { isDefault: true });
      }
    }

    await firebase.deleteDocument('accounts', accountId);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to delete account' },
      500
    );
  }
});

// PATCH /accounts/:id/set-default - Definir uma conta como padrão
app.patch('/:id/set-default', async (c) => {
  try {
    const accountId = c.req.param('id');
    const userId = c.get('userId');
    const firebase = new FirebaseService(c.env);

    // Verificar se a conta existe e pertence ao usuário
    const existingAccount = await firebase.getDocument('accounts', accountId);
    if (!existingAccount) {
      return c.json(
        { success: false, error: 'Account not found' },
        404
      );
    }

    if (existingAccount.userId !== userId) {
      return c.json(
        { success: false, error: 'Unauthorized' },
        403
      );
    }

    // Remover o padrão de todas as outras contas do usuário
    const accounts = await firebase.getDocuments('accounts', userId) as Array<{ id: string; isDefault?: boolean }>;
    for (const account of accounts) {
      if (account.id !== accountId && account.isDefault) {
        await firebase.updateDocument('accounts', account.id, { isDefault: false });
      }
    }

    // Definir a conta atual como padrão
    await firebase.updateDocument('accounts', accountId, {
      isDefault: true,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: 'Failed to set default account' },
      500
    );
  }
});

export default app;
