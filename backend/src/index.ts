import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Variables } from './types/context';

// Import routes
import categories from './routes/categories';
import transactions from './routes/transactions';
import budgets from './routes/budgets';
import reports from './routes/reports';
import voice from './routes/voice';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Enable CORS
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Fluxo de Caixa API is running',
    version: '1.0.0',
  });
});

// Mount routes
app.route('/api/categories', categories);
app.route('/api/transactions', transactions);
app.route('/api/budgets', budgets);
app.route('/api/reports', reports);
app.route('/api/voice', voice);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    { success: false, error: 'Internal server error' },
    500
  );
});

export default app;
