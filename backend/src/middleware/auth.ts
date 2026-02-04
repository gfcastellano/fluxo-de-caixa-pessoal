import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types/context';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  // Handle preflight OPTIONS requests
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { success: false, error: 'Unauthorized - No token provided' },
      401
    );
  }

  const token = authHeader.substring(7);
  
  if (!token || token.length < 10) {
    return c.json({ success: false, error: 'Invalid token format' }, 401);
  }

  try {
    // Verify Firebase JWT token using Firebase Auth REST API
    // Strip quotes from API key if present
    const apiKey = (c.env.FIREBASE_API_KEY || '').replace(/^["']|["']$/g, '');
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        return c.json({ success: false, error: 'Invalid token', details: errorData }, 401);
      } catch {
        return c.json({ success: false, error: 'Firebase auth failed', details: errorText }, 401);
      }
    }

    const data = await response.json() as { users?: Array<{ localId: string; email: string }> };

    if (!data.users || data.users.length === 0) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }

    const user = data.users[0];
    c.set('userId', user.localId);
    c.set('userEmail', user.email);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ success: false, error: 'Token verification failed' }, 401);
  }
};
