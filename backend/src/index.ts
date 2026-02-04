import { Hono } from 'hono';
import type { Env, Variables } from './types/context';

// Import routes
import categories from './routes/categories';
import transactions from './routes/transactions';
import budgets from './routes/budgets';
import reports from './routes/reports';
import voice from './routes/voice';
import accounts from './routes/accounts';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Custom CORS middleware to handle preflight and actual requests
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  
  // Allow specific origins
  const allowedOrigins = [
    'http://localhost:5173',
    'https://fluxo-de-caixa-frontend.pages.dev',
    'https://281f2731.fluxo-de-caixa-frontend.pages.dev',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
  }
  
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }
  
  await next();
});

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
app.route('/api/accounts', accounts);

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
