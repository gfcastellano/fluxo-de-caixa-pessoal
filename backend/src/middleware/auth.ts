import type { MiddlewareHandler } from 'hono';
import type { Context } from '../types/context';

export const authMiddleware: MiddlewareHandler<Context> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { success: false, error: 'Unauthorized - No token provided' },
      401
    );
  }

  const token = authHeader.substring(7);

  try {
    // Verify Firebase JWT token using Firebase Auth REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${c.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Firebase auth error:', errorData);
      return c.json({ success: false, error: 'Invalid token', details: errorData }, 401);
    }

    const data = await response.json();

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
